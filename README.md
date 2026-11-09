# SISalidas

Sistema de permisos de salida de OSFEM, reescrito en **Angular 22 + NestJS 11** con la misma
arquitectura que SIArchivoDigital. Reemplaza al sistema Laravel `salidas` y **usa las mismas bases de
datos**, así que ambos pueden convivir durante la transición.

## Qué hace

| Pantalla | Para qué |
| --- | --- |
| Hoy | El permiso activo sobre la regla de la jornada, solicitudes por atender y actividad reciente. |
| Salidas | Los permisos propios por año y estado. Solicitud nueva arrastrando el horario en la regla. |
| Detalle | Solicitado contra registrado, bitácora del permiso, formato oficial en PDF y cierre. |
| Validar | Bandeja del jefe o validador especial para aprobar o denegar. |
| Reportes | Un solo reporte limitado al alcance de cada quien, con exportación a Excel y PDF. |
| Administración | Validadores especiales, consulta de jefes y roles (rol `administrador`). |
| Mi cuenta | Datos de contacto, de donde sale el correo de avisos, y contraseña. |

En segundo plano, `checadas/` lee los biométricos cada minuto, liga cada checada al permiso activo de
la persona y avisa al jefe.

## Arquitectura

```
SISalidas/
├── src/app/
│   ├── core/              Servicios HTTP, guards e interceptor (JWT)
│   ├── layout/shell/      Navegación, tema y cierre por inactividad
│   ├── shared/            Regla de jornada, filas, buscador, avisos, iconos
│   └── features/          Una carpeta por pantalla
└── backend/src/
    ├── auth/, roles/      Login contra users_safs y roles propios
    ├── common/            Reglas de negocio, padrón, alcance (quién ve qué), correo
    ├── database/          Modelos, migraciones y seeders (sequelize-cli)
    ├── permisos/          Solicitud, consulta, cierre y PDF oficial
    ├── validacion/        Bandeja y decisión del jefe
    ├── reportes/          Consulta, Excel y PDF
    ├── especiales/        Validadores especiales
    ├── perfil/            Datos de contacto y contraseña
    └── checadas/          Lectura de biométricos y cierre de vencidos
```

Diferencias a propósito con SIArchivoDigital: el diseño es propio, sin Bootstrap, ag-grid ni
SweetAlert (en las listas de este sistema la regla de jornada dice más que una tabla), y `exceljs` en
lugar de `xlsx`, cuya versión de npm tiene vulnerabilidades sin corregir.

### Bases de datos

| Conexión | Base | Uso |
| --- | --- | --- |
| principal | `adminplem_salidas` | `registros`, `destinos`, `folios`, `especials`, `iclock_transactions`, más `roles` y `usuario_roles`. |
| `external` | `adminplem_saf` | Login y padrón. Solo se escribe la contraseña y `s_datosGeneralesUsr`. |
| `directorio` | `adminplem_directorio` | Edificios (`ubicaciones`). Solo lectura. |
| `checadores` | `checadores` | Biométricos (`iclock_transaction`, `personnel_employee`). Solo lectura. |

Particularidades que conviene conocer:

| Tema | Detalle |
| --- | --- |
| `registros.aprobacion` | 0 pendiente, 1 aprobado, 2 denegado. |
| `registros.status` | 1 activo, 0 cerrado. Un permiso pendiente y cerrado se muestra como "Sin respuesta". |
| `punch_state` | `5` salida, `4` entrada. |
| `personnel_employee.first_name` | Guarda el RFC, no el nombre. |
| `idDestino = 999` | Destino "otro": el texto va en `otroDestino`, que es varchar(100). |
| Horas | `punch_time` es DATETIME con la hora local de México. `created_at` y `hora_aprobacion` son TIMESTAMP. Por eso las conexiones usan `-06:00`. |
| Terminales | `UBICACION_POR_TERMINAL` (`checadas.logic.ts`) liga cada checador con su `ubicaciones.id`. Un checador nuevo se agrega ahí. |

## Puesta en marcha local

Se usan tus bases de MariaDB locales. La de checadores solo existe en el servidor de los biométricos,
así que el `docker-compose.yml` levanta una de prueba, sin datos reales.

```bash
cp backend/.env.example backend/.env
```

En `backend/.env`, para el contenedor `mysql-bd` (puerto 3307 de tu máquina), en las tres conexiones:

```
DB_HOST=host.docker.internal
DB_PORT=3307
DB_USERNAME=...
DB_PASSWORD=...

DB_CHECADORES_HOST=checadores-prueba
DB_CHECADORES_USERNAME=root
DB_CHECADORES_PASSWORD=checadores-local

JWT_SECRET=...   # openssl rand -base64 48
```

```bash
docker compose up -d
docker compose exec backend npm run migrate   # crea roles y usuario_roles, y agrega índices
docker compose exec backend npm run seed      # roles y las personas que Laravel tenía fijas por RFC
```

Aplicación: <http://localhost:4260>. Se entra con el RFC y la contraseña de siempre.

Las migraciones no modifican ni borran datos: en una base existente solo agregan esas dos tablas y
los índices. Su `down` tampoco borra las tablas heredadas.

## Pasar a producción

1. Publicar con `docker compose -f docker-compose.prod.yml up -d --build` con `CHECADAS_ACTIVO=false`
   y `CORREO_ACTIVO=true`. La imagen se compila para `/salidas/`: el proxy del servidor debe quitar ese
   prefijo antes de llegar al contenedor del frontend (puerto 8079).
2. Ejecutar `npm run migrate` y `npm run seed` en el contenedor del backend.
3. Probar con usuarios reales mientras Laravel sigue activo.
4. **En el mismo momento:** apagar el cron de Laravel (`permiso:users` y `desactivar:todo`) y poner
   `CHECADAS_ACTIVO=true`. Si ambos corren a la vez, los avisos al jefe llegan repetidos.
5. Redirigir la URL de Laravel a la nueva y darlo de baja.

## Diferencias con Laravel

Se corrigió:

| Antes | Ahora |
| --- | --- |
| Cualquier usuario con sesión podía ver, cerrar o aprobar un permiso ajeno cambiando el id en la URL. | Cada acción valida propietario o área. |
| Desde el 31/03/2026 los permisos laborales casi no se ligaban a sus checadas: de ~28 % a menos de 2 % al mes, porque se comparaban ids equivocados. | Cada checador se liga a su edificio real. |
| Las reglas del formulario solo existían en el navegador; hay permisos con fecha del año 5025. | El backend valida jornada, fechas (hasta un año adelante), horas y destinos. |
| Con un destino laboral no reconocido, el cron fallaba y dejaba sin procesar el resto del lote. | Cada checada se procesa por separado. |
| Las checadas se procesaban de la más nueva a la más antigua y se podían invertir salida y entrada. | Orden cronológico. |
| La bandeja mostraba unos 30 mil pendientes ya cerrados. | Solo los activos. |
| El reporte de rango 1 y 2 terminaba en un `dd('auditores')`. | Funciona como los demás, por dirección. |
| `/register` era público y creaba cuentas. | Eliminado. |
| Un error de SMTP mostraba una página de error aunque el permiso sí se guardaba. | El aviso falla sin afectar la operación; queda en el log. |
| Listas de RFC escritas en el código. | Roles, administrables desde la pantalla. |

Cambió porque así se decidió, y conviene confirmarlo con el área usuaria:

- **Una decisión es definitiva.** En Laravel el jefe podía cambiar una aprobación ya dada.
- **La baja de un jefe ya no toca el padrón.** "Rol de usuarios" podía poner `Estado = 0` en `s_usuario`,
  la tabla compartida con todos los sistemas; eso se hace ahora en la SAF.
- **Cambiar la contraseña pide la actual.**
- **Folio.** El permiso de comida usa `C` (el PDF decía `L`) y el año es el del permiso, no el de la
  fecha en que se imprime.
- **Correo de avisos.** Siempre se usa el de datos de contacto y, si no hay, el del padrón.

Se conservó igual, aunque vale la pena revisarlo:

- Un jefe puede aprobar su propio permiso.
- Las checadas se registran aunque el permiso siga pendiente.
- Quien tiene un permiso activo con fecha futura no puede solicitar otro hasta cerrarlo.
- Un doble toque en el checador cuenta como salida y entrada.

## Pruebas

```bash
docker compose exec backend npm test
docker compose exec frontend npx ng test --watch=false
```
