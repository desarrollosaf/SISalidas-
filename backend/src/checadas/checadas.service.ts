import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Op } from 'sequelize';
import { CorreoService } from '../common/correo.service';
import { fechaHoyMexico } from '../common/fecha-mexico.util';
import { PadronService } from '../common/padron.service';
import { TIPO_LABORAL } from '../common/reglas';
import { fechaHoraMexico } from '../common/vista-permiso.service';
import { EmpleadoChecador, TransaccionChecador } from '../database/models/externos.models';
import { ChecadaRegistrada, Destino, Registro } from '../database/models/principal.models';
import {
  ESTADO_SALIDA,
  estadoDeChecada,
  TERMINALES,
  UBICACION_POR_TERMINAL,
} from './checadas.logic';

/** Cuántas checadas recientes se revisan en cada corrida; igual que Laravel. */
const LOTE = 50;

/**
 * Lee los checadores y liga cada checada al permiso activo de esa persona. Sustituye a los comandos
 * `permiso:users` y `desactivar:todo`. Solo corre con CHECADAS_ACTIVO=true: mientras siga el cron de
 * Laravel debe quedar apagado, o los avisos al jefe llegarían repetidos.
 */
@Injectable()
export class ChecadasService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ChecadasService.name);
  private procesando = false;

  constructor(
    private readonly config: ConfigService,
    private readonly padron: PadronService,
    private readonly correo: CorreoService,
    @InjectModel(TransaccionChecador, 'checadores')
    private readonly transacciones: typeof TransaccionChecador,
    @InjectModel(EmpleadoChecador, 'checadores')
    private readonly empleados: typeof EmpleadoChecador,
    @InjectModel(ChecadaRegistrada) private readonly checadas: typeof ChecadaRegistrada,
    @InjectModel(Registro) private readonly registros: typeof Registro,
    @InjectModel(Destino) private readonly destinos: typeof Destino,
  ) {}

  /** Que quede en el log si la lectura de checadores está encendida: apagada no deja otro rastro. */
  onApplicationBootstrap(): void {
    if (this.activo) {
      this.logger.log('Lectura de checadores ENCENDIDA (cada minuto)');
    } else {
      this.logger.warn('Lectura de checadores APAGADA (CHECADAS_ACTIVO no es true)');
    }
  }

  private get activo(): boolean {
    return !!this.config.get<boolean>('operacion.checadasActivo');
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async leerChecadores(): Promise<void> {
    if (!this.activo || this.procesando) return;
    this.procesando = true;
    try {
      await this.procesar();
    } catch (error) {
      this.logger.error('Falló la lectura de checadores', error instanceof Error ? error.stack : error);
    } finally {
      this.procesando = false;
    }
  }

  /** Cierra lo de días anteriores. Laravel lo hacía cada minuto; con cada hora es suficiente. */
  @Cron(CronExpression.EVERY_HOUR)
  async cerrarVencidos(): Promise<void> {
    if (!this.activo) return;
    const hoy = fechaHoyMexico();
    await this.registros.update(
      { status: 0 },
      { where: { status: 1, fecha_permiso: { [Op.lt]: hoy } } },
    );
    await this.checadas.update(
      { status: 0 },
      { where: { status: 1, fecha_registro: { [Op.lt]: hoy } } },
    );
  }

  async procesar(): Promise<void> {
    const hoy = fechaHoyMexico();
    const recientes = await this.transacciones.findAll({
      where: {
        terminal_alias: { [Op.in]: TERMINALES },
        punch_time: {
          [Op.between]: [new Date(`${hoy}T00:00:00-06:00`), new Date(`${hoy}T23:59:59-06:00`)],
        },
      },
      order: [['id', 'DESC']],
      limit: LOTE,
    });
    if (!recientes.length) return;

    const empleados = await this.empleados.findAll({
      where: { emp_code: { [Op.in]: [...new Set(recientes.map((t) => t.emp_code))] } },
    });
    const rfcPorEmpleado = new Map(empleados.map((e) => [e.emp_code, e.first_name]));

    // Del más antiguo al más nuevo: Laravel las recorría al revés, y si alguien checaba dos veces
    // entre corridas se le intercambiaban la salida y la entrada.
    for (const transaccion of [...recientes].reverse()) {
      const rfc = rfcPorEmpleado.get(transaccion.emp_code);
      if (!rfc) continue;
      try {
        await this.procesarChecada(transaccion, rfc, hoy);
      } catch (error) {
        this.logger.error(
          `No se pudo procesar la checada ${transaccion.id}`,
          error instanceof Error ? error.stack : error,
        );
      }
    }
  }

  private async procesarChecada(
    transaccion: TransaccionChecador,
    rfc: string,
    hoy: string,
  ): Promise<void> {
    const idChecador = String(transaccion.id);
    if (await this.checadas.findOne({ where: { id_checador: idChecador } })) return;

    const permiso = await this.registros.findOne({
      where: { rfc_usuario: rfc, status: 1, fecha_permiso: hoy },
    });
    if (!permiso) return;

    const ubicacion = UBICACION_POR_TERMINAL[transaccion.terminal_alias];
    const checadasPrevias = await this.checadas.count({
      where: {
        rfc_usuario: rfc,
        fecha_registro: hoy,
        terminal_alias: transaccion.terminal_alias,
        status: 1,
      },
    });
    const estado = estadoDeChecada({
      tipo: permiso.tipo_permiso,
      origen: permiso.origen,
      ubicacion,
      checadasPrevias,
    });
    const esSalida = estado === ESTADO_SALIDA;

    const checada = await this.checadas.create({
      id_checador: idChecador,
      emp_code: transaccion.emp_code,
      terminal_id: transaccion.terminal_id,
      punch_time: transaccion.punch_time,
      punch_state: estado,
      terminal_alias: transaccion.terminal_alias,
      rfc_usuario: rfc,
      fecha_registro: hoy,
    });

    const destino = await this.destinos.findOne({
      where: { status: 1, idRegistro: permiso.id, idDestino: ubicacion },
    });
    if (destino) {
      await destino.update(esSalida ? { idSalida: checada.id } : { idEntrada: checada.id });
    }
    const eslaboralFuera = permiso.tipo_permiso === TIPO_LABORAL && permiso.origen !== ubicacion;
    if (!eslaboralFuera) {
      await permiso.update(esSalida ? { id_salida: checada.id } : { id_entrada: checada.id });
    }

    await this.avisarAlJefe(rfc, esSalida ? 'salida' : 'entrada', transaccion.punch_time);
  }

  private async avisarAlJefe(rfc: string, tipo: string, hora: Date): Promise<void> {
    const jefe = await this.padron.jefeDe(rfc);
    const correo = jefe && (await this.padron.correoDe(jefe));
    if (!jefe || !correo) return;
    const [personas, dependencias] = await Promise.all([
      this.padron.personasPorRfc([rfc]),
      this.padron.nombresDependencias([jefe.id_Dependencia!]),
    ]);
    await this.correo.checadaRegistrada(correo, {
      jefe: jefe.Nombre.trim(),
      dependencia: dependencias.get(jefe.id_Dependencia!) ?? '',
      servidor: personas.get(rfc)?.Nombre.trim() ?? rfc,
      tipo,
      fechaHora: fechaHoraMexico(hora) ?? '',
    });
  }
}
