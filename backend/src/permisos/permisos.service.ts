import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Op, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { AlcanceService } from '../common/alcance.service';
import { CorreoService } from '../common/correo.service';
import { anioActualMexico, fechaHoyMexico } from '../common/fecha-mexico.util';
import { PadronService } from '../common/padron.service';
import { DESTINO_OTRO, erroresSolicitud, TIPO_LABORAL } from '../common/reglas';
import { type UsuarioActual } from '../common/usuario-actual';
import { VistaPermisoService } from '../common/vista-permiso.service';
import { Ubicacion } from '../database/models/externos.models';
import {
  ChecadaRegistrada,
  Destino,
  Folio,
  Registro,
} from '../database/models/principal.models';
import { CrearPermisoDto } from './dto/crear-permiso.dto';

@Injectable()
export class PermisosService {
  constructor(
    @InjectConnection() private readonly sequelize: Sequelize,
    @InjectModel(Registro) private readonly registros: typeof Registro,
    @InjectModel(Destino) private readonly destinos: typeof Destino,
    @InjectModel(Folio) private readonly folios: typeof Folio,
    @InjectModel(ChecadaRegistrada) private readonly checadas: typeof ChecadaRegistrada,
    @InjectModel(Ubicacion, 'directorio') private readonly ubicaciones: typeof Ubicacion,
    private readonly vistas: VistaPermisoService,
    private readonly alcance: AlcanceService,
    private readonly padron: PadronService,
    private readonly correo: CorreoService,
  ) {}

  /** Los permisos del año de la persona y el que tenga activo. */
  async mios(rfc: string, anio?: number) {
    const elegido = anio ?? anioActualMexico();
    const filas = await this.registros.findAll({
      where: {
        rfc_usuario: rfc,
        fecha_permiso: { [Op.between]: [`${elegido}-01-01`, `${elegido}-12-31`] },
      },
      order: [
        ['fecha_permiso', 'DESC'],
        ['hora_salida', 'DESC'],
      ],
    });
    const activo = await this.activoDe(rfc);
    return {
      anio: elegido,
      hoy: fechaHoyMexico(),
      activo: activo ? await this.vistas.vista(activo) : null,
      permisos: await this.vistas.vistas(filas),
    };
  }

  private activoDe(rfc: string): Promise<Registro | null> {
    return this.registros.findOne({
      where: { rfc_usuario: rfc, status: 1 },
      order: [['fecha_permiso', 'ASC']],
    });
  }

  async ver(id: number, usuario: UsuarioActual) {
    const registro = await this.buscar(id);
    await this.alcance.exigirVer(registro, usuario);
    return {
      ...(await this.vistas.vista(registro)),
      puedeValidar: await this.alcance.puedeValidar(registro, usuario),
      esPropio: registro.rfc_usuario === usuario.rfc,
    };
  }

  async buscar(id: number): Promise<Registro> {
    const registro = await this.registros.findByPk(id);
    if (!registro) throw new NotFoundException('El permiso no existe');
    return registro;
  }

  async crear(dto: CrearPermisoDto, usuario: UsuarioActual) {
    const errores = erroresSolicitud(dto, fechaHoyMexico());
    if (errores.length) throw new BadRequestException(errores);

    // En Laravel solo se ocultaba el botón de "solicitar".
    if (await this.activoDe(usuario.rfc)) {
      throw new ConflictException('Ya tienes un permiso activo. Ciérralo antes de solicitar otro.');
    }

    const esLaboral = dto.tipo_permiso === TIPO_LABORAL;
    const destinos = esLaboral ? [...new Set(dto.destinos ?? [])] : [];
    const edificios = destinos.filter((id) => id !== DESTINO_OTRO);
    if (edificios.length) {
      const existentes = await this.ubicaciones.count({ where: { id: { [Op.in]: edificios } } });
      if (existentes !== edificios.length) {
        throw new BadRequestException(['Alguno de los destinos no existe']);
      }
    }

    const registro = await this.sequelize.transaction(async (transaction) => {
      const folio = await this.siguienteFolio(usuario.rfc, dto.tipo_permiso, transaction);
      const nuevo = await this.registros.create(
        {
          rfc_usuario: usuario.rfc,
          fecha_permiso: dto.fecha_permiso,
          hora_salida: dto.hora_salida,
          hora_regreso: dto.regresa ? dto.hora_regreso : null,
          regresa: dto.regresa ? 1 : 0,
          tipo_permiso: dto.tipo_permiso,
          origen: esLaboral ? dto.origen : null,
          folio,
        },
        { transaction },
      );
      for (const idDestino of destinos) {
        await this.destinos.create(
          {
            idRegistro: nuevo.id,
            idDestino,
            otroDestino: idDestino === DESTINO_OTRO ? dto.otro?.trim() : null,
          },
          { transaction },
        );
      }
      return nuevo;
    });

    await this.avisarAlJefe(usuario.rfc);
    return this.vistas.vista(registro);
  }

  private async siguienteFolio(
    rfc: string,
    tipo: number,
    transaction: Transaction,
  ): Promise<number> {
    const actual = await this.folios.findOne({
      where: { rfcUs: rfc, tipo_permiso: tipo },
      transaction,
      lock: true,
    });
    if (actual) {
      const siguiente = actual.folio + 1;
      await actual.update({ folio: siguiente }, { transaction });
      return siguiente;
    }
    await this.folios.create({ rfcUs: rfc, tipo_permiso: tipo, folio: 1 }, { transaction });
    return 1;
  }

  private async avisarAlJefe(rfc: string): Promise<void> {
    const jefe = await this.padron.jefeDe(rfc);
    const correo = jefe && (await this.padron.correoDe(jefe));
    if (!correo) return;
    const personas = await this.padron.personasPorRfc([rfc]);
    await this.correo.solicitudNueva(correo, personas.get(rfc)?.Nombre.trim() ?? rfc);
  }

  /** La persona cierra su propio permiso. */
  async cerrarPropio(id: number, usuario: UsuarioActual) {
    const registro = await this.buscar(id);
    if (registro.rfc_usuario !== usuario.rfc) {
      await this.alcance.exigirValidar(registro, usuario);
    }
    return this.cerrar(registro);
  }

  async cerrar(registro: Registro) {
    await this.sequelize.transaction(async (transaction) => {
      await registro.update({ status: 0 }, { transaction });
      await this.destinos.update(
        { status: 0 },
        { where: { idRegistro: registro.id }, transaction },
      );
      await this.checadas.update(
        { status: 0 },
        { where: { rfc_usuario: registro.rfc_usuario, status: 1 }, transaction },
      );
    });
    return this.vistas.vista(registro);
  }
}
