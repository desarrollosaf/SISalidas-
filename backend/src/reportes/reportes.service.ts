import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as ExcelJS from 'exceljs';
import { join } from 'path';
import PDFDocument from 'pdfkit';
import { Op, WhereOptions } from 'sequelize';
import { AlcanceReportes, AlcanceService } from '../common/alcance.service';
import { PadronService } from '../common/padron.service';
import { DEPENDENCIA_OSFEM } from '../common/reglas';
import { type UsuarioActual } from '../common/usuario-actual';
import { PermisoVista, VistaPermisoService } from '../common/vista-permiso.service';
import { Registro } from '../database/models/principal.models';

export interface FiltroReporte {
  inicio?: string;
  fin?: string;
  direccion?: string;
  departamento?: string;
  rfc?: string;
  tipo?: string;
  estado?: string;
}

/** En pantalla se ven los primeros; el Excel y el PDF traen todos. */
const LIMITE_PANTALLA = 300;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const APROBACION: Record<string, number> = { pendiente: 0, aprobado: 1, denegado: 2 };
const NOMBRE_ESTADO: Record<string, string> = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  denegado: 'Denegado',
};
const MEMBRETE = join(process.cwd(), 'assets', 'membrete');

/** "01:30" a partir de minutos. */
const duracion = (minutos: number | null) =>
  minutos == null
    ? ''
    : `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;

/**
 * Un solo reporte para todos: Laravel tenía uno por jefe de departamento, otro por director y otro
 * general, con el mismo código repetido. Lo único que cambia es el alcance de quien lo pide.
 */
@Injectable()
export class ReportesService {
  constructor(
    @InjectModel(Registro) private readonly registros: typeof Registro,
    private readonly alcance: AlcanceService,
    private readonly padron: PadronService,
    private readonly vistas: VistaPermisoService,
  ) {}

  private async alcanceExigido(usuario: UsuarioActual): Promise<AlcanceReportes> {
    const alcance = await this.alcance.alcanceReportes(usuario);
    if (!alcance.todo && !alcance.departamentos.length && !alcance.direcciones.length) {
      throw new ForbiddenException('No tienes acceso a los reportes');
    }
    return alcance;
  }

  /** Las opciones de los filtros, limitadas a lo que la persona puede consultar. */
  async opciones(usuario: UsuarioActual) {
    const alcance = await this.alcanceExigido(usuario);
    if (alcance.todo) {
      const [direcciones, departamentos, personas] = await Promise.all([
        this.padron.listaDirecciones(DEPENDENCIA_OSFEM),
        this.padron.listaDepartamentos({ dependencia: DEPENDENCIA_OSFEM }),
        this.padron.personas({ dependencia: DEPENDENCIA_OSFEM }),
      ]);
      return { general: true, direcciones, departamentos, personas };
    }
    const [departamentos, personas] = await Promise.all([
      this.padron.listaDepartamentos({
        direcciones: alcance.direcciones,
        ids: alcance.departamentos,
      }),
      this.padron.personas({
        departamentos: alcance.departamentos,
        direcciones: alcance.direcciones,
      }),
    ]);
    return { general: false, direcciones: [], departamentos, personas };
  }

  /** Arma la condición, siempre dentro del alcance: los filtros solo pueden reducirlo. */
  private async condicion(usuario: UsuarioActual, filtro: FiltroReporte): Promise<WhereOptions> {
    const alcance = await this.alcanceExigido(usuario);
    if (!filtro.inicio || !filtro.fin || !FECHA.test(filtro.inicio) || !FECHA.test(filtro.fin)) {
      throw new BadRequestException(['Indica el periodo del reporte']);
    }
    if (filtro.inicio > filtro.fin) {
      throw new BadRequestException(['La fecha inicial no puede ser posterior a la final']);
    }

    const where: Record<string | symbol, unknown> = {
      fecha_permiso: { [Op.between]: [filtro.inicio, filtro.fin] },
    };
    if (filtro.tipo) where['tipo_permiso'] = Number(filtro.tipo);
    if (filtro.estado && filtro.estado in APROBACION) {
      where['aprobacion'] = APROBACION[filtro.estado];
    }

    const permitidos = alcance.todo
      ? null
      : new Set(await this.padron.rfcsDe(alcance.departamentos, alcance.direcciones));

    let elegidos: string[] | null = null;
    if (filtro.rfc) {
      elegidos = [filtro.rfc];
    } else if (filtro.departamento) {
      elegidos = await this.padron.rfcsDe([Number(filtro.departamento)]);
    } else if (filtro.direccion) {
      elegidos = await this.padron.rfcsDe([], [Number(filtro.direccion)]);
    }

    if (permitidos) {
      const rfcs = elegidos ? elegidos.filter((rfc) => permitidos.has(rfc)) : [...permitidos];
      where['rfc_usuario'] = { [Op.in]: rfcs };
    } else if (elegidos) {
      where['rfc_usuario'] = { [Op.in]: elegidos };
    }
    return where;
  }

  async consultar(usuario: UsuarioActual, filtro: FiltroReporte) {
    const where = await this.condicion(usuario, filtro);
    const [conteos, filas] = await Promise.all([
      this.registros.count({ where, group: ['aprobacion'] }),
      this.registros.findAll({
        where,
        order: [
          ['fecha_permiso', 'DESC'],
          ['hora_salida', 'DESC'],
        ],
        limit: LIMITE_PANTALLA,
      }),
    ]);
    const por = (valor: number) =>
      (conteos as unknown as { aprobacion: number; count: number }[]).find(
        (c) => c.aprobacion === valor,
      )?.count ?? 0;
    const resumen = { pendientes: por(0), aprobados: por(1), denegados: por(2) };
    return {
      resumen: {
        ...resumen,
        total: resumen.pendientes + resumen.aprobados + resumen.denegados,
      },
      limite: LIMITE_PANTALLA,
      permisos: await this.vistas.vistas(filas),
    };
  }

  private async todos(usuario: UsuarioActual, filtro: FiltroReporte): Promise<PermisoVista[]> {
    const where = await this.condicion(usuario, filtro);
    const filas = await this.registros.findAll({
      where,
      order: [
        ['fecha_permiso', 'DESC'],
        ['hora_salida', 'DESC'],
      ],
    });
    return this.vistas.vistas(filas);
  }

  /** Las mismas columnas que el Excel de Laravel, más el estado. */
  async excel(usuario: UsuarioActual, filtro: FiltroReporte): Promise<Buffer> {
    const permisos = await this.todos(usuario, filtro);
    const libro = new ExcelJS.Workbook();
    const hoja = libro.addWorksheet('Permisos', { views: [{ state: 'frozen', ySplit: 1 }] });

    const maxDestinos = Math.max(5, ...permisos.map((p) => p.destinos.length));
    const columnas = [
      'Dirección',
      'Departamento',
      'Persona servidora pública',
      'Fecha del permiso',
      'Salida solicitada',
      'Entrada solicitada',
      'Salida registrada',
      'Entrada registrada',
      'Tiempo solicitado',
      'Tiempo ocupado',
      'Tipo de permiso',
      'Estado',
      'Folio',
    ];
    for (let i = 1; i <= maxDestinos; i++) {
      columnas.push(`Destino ${i}`, 'Hora de entrada', 'Hora de salida');
    }
    const encabezado = hoja.addRow(columnas);
    encabezado.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    encabezado.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF960948' } };

    for (const p of permisos) {
      hoja.addRow([
        p.direccion,
        p.departamento,
        p.nombre,
        p.fecha,
        p.horaSalida,
        p.regresa ? p.horaRegreso : 'No regresa',
        p.salidaRegistrada ?? 'Sin registro',
        p.regresa ? (p.entradaRegistrada ?? 'Sin registro') : 'No regresa',
        duracion(p.minutosSolicitados),
        duracion(p.minutosOcupados),
        p.tipoNombre,
        NOMBRE_ESTADO[p.estado],
        p.folio,
        ...p.destinos.flatMap((d) => [
          d.nombre,
          d.entrada ?? 'Sin registro',
          d.salida ?? 'Sin registro',
        ]),
      ]);
    }
    hoja.columns.forEach((columna, i) => {
      columna.width = i < 3 ? 34 : 18;
    });
    return Buffer.from(await libro.xlsx.writeBuffer());
  }

  async pdf(usuario: UsuarioActual, filtro: FiltroReporte): Promise<Buffer> {
    const permisos = await this.todos(usuario, filtro);
    const doc = new PDFDocument({ size: 'LETTER', layout: 'landscape', margin: 36, bufferPages: true });
    const partes: Buffer[] = [];
    doc.on('data', (parte: Buffer) => partes.push(parte));
    const fin = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(partes))));

    const columnas: [string, number][] = [
      ['Persona / Departamento', 210],
      ['Fecha', 58],
      ['Solicitado', 72],
      ['Registrado', 100],
      ['T. solic.', 44],
      ['T. ocup.', 44],
      ['Tipo', 48],
      ['Estado', 54],
      ['Folio', 90],
    ];
    const encabezado = () => {
      let x = 36;
      doc.rect(36, doc.y, 720, 18).fill('#960948');
      const y = doc.y + 5;
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7.5);
      for (const [titulo, ancho] of columnas) {
        doc.text(titulo, x + 4, y, { width: ancho - 8, lineBreak: false });
        x += ancho;
      }
      doc.x = 36;
      doc.y = y + 15;
    };

    doc.image(join(MEMBRETE, 'Membrete_OSFEM_superior_01.png'), 36, 24, { width: 400 });
    doc.y = 110;
    doc
      .fillColor('#960948')
      .font('Helvetica-Bold')
      .fontSize(13)
      .text(`Reporte de permisos del ${filtro.inicio} al ${filtro.fin}`, 36);
    doc.moveDown(0.6);
    encabezado();

    for (const p of permisos) {
      const celdas = [
        `${p.nombre}\n${p.departamento ?? ''}`,
        p.fecha,
        `${p.horaSalida} / ${p.regresa ? p.horaRegreso : 'No regresa'}`,
        `${p.salidaRegistrada ?? 'Pendiente'} / ${p.regresa ? (p.entradaRegistrada ?? 'Pendiente') : 'No regresa'}`,
        duracion(p.minutosSolicitados),
        duracion(p.minutosOcupados),
        p.tipoNombre,
        NOMBRE_ESTADO[p.estado],
        p.folio,
      ];
      doc.font('Helvetica').fontSize(7);
      const alto =
        Math.max(...celdas.map((c, i) => doc.heightOfString(c, { width: columnas[i][1] - 8 }))) + 8;
      if (doc.y + alto > doc.page.height - 40) {
        doc.addPage();
        encabezado();
      }
      const y = doc.y;
      let x = 36;
      doc.fillColor('#1E1619');
      celdas.forEach((celda, i) => {
        doc.text(celda, x + 4, y + 4, { width: columnas[i][1] - 8 });
        x += columnas[i][1];
      });
      doc
        .moveTo(36, y + alto)
        .lineTo(756, y + alto)
        .strokeColor('#E8E2DE')
        .lineWidth(0.5)
        .stroke();
      doc.x = 36;
      doc.y = y + alto;
    }
    if (!permisos.length) {
      doc.moveDown().fillColor('#6F6468').fontSize(9).text('Sin permisos en este periodo.', 36);
    }
    doc.end();
    return fin;
  }
}
