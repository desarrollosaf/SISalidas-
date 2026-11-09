import { Injectable } from '@nestjs/common';
import { join } from 'path';
import PDFDocument from 'pdfkit';
import { PermisoVista, VistaPermisoService } from '../common/vista-permiso.service';
import { fechaHoyMexico } from '../common/fecha-mexico.util';
import { TIPO_LABORAL } from '../common/reglas';
import { Registro } from '../database/models/principal.models';

const MEMBRETE = join(process.cwd(), 'assets', 'membrete');
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
const VINO = '#960948';
const LINEA = '#D9D2CE';
const MARGEN = 50;
const ANCHO = 512;

/** El formato oficial del permiso: mismo membrete, fundamento legal y datos que en Laravel. */
@Injectable()
export class PermisoPdfService {
  constructor(private readonly vistas: VistaPermisoService) {}

  async generar(registro: Registro): Promise<Buffer> {
    const permiso = await this.vistas.vista(registro);
    const doc = new PDFDocument({ size: 'LETTER', margins: { top: 0, left: 0, right: 0, bottom: 0 } });
    const partes: Buffer[] = [];
    doc.on('data', (parte: Buffer) => partes.push(parte));
    const fin = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(partes))));

    doc.image(join(MEMBRETE, 'Membrete_OSFEM_superior_01.png'), 0, 0, { width: doc.page.width });
    this.contenido(doc, permiso);
    const pie = join(MEMBRETE, 'Membrete_OSFEM_2.png');
    doc.image(pie, 0, doc.page.height - 71, { width: doc.page.width });
    doc.end();
    return fin;
  }

  private contenido(doc: PDFKit.PDFDocument, p: PermisoVista): void {
    const [anio, mes, dia] = fechaHoyMexico().split('-');
    doc.fillColor('#1E1619').font('Helvetica-Bold').fontSize(9);
    doc.text(
      `Toluca de Lerdo, Estado de México; ${Number(dia)} de ${MESES[Number(mes) - 1]} de ${anio}`,
      MARGEN,
      112,
      { width: ANCHO },
    );
    doc.moveDown(0.4).text(`Solicitud número: ${p.folio}`, { width: ANCHO });
    doc.moveDown(0.8).fillColor(VINO).fontSize(14).text('Registro de solicitud de permiso', {
      width: ANCHO,
    });
    doc
      .moveDown(0.5)
      .fillColor('#1E1619')
      .font('Helvetica')
      .fontSize(8)
      .text(
        'Con el propósito de dar cumplimiento a lo establecido en los artículos 30, 31 y 32 del Reglamento de las Condiciones de Trabajo del Poder Legislativo del Estado de México, se realiza la solicitud de permiso para ausentarse en horas de oficina a fin de atender trámites de índole particular y/o relacionados con el desempeño de sus labores.',
        { width: ANCHO, align: 'justify' },
      );

    let y = doc.y + 10;
    const completa = (etiqueta: string, valor: string | null) => {
      y = this.fila(doc, y, [[etiqueta, 170], [valor ?? 'Sin dato', ANCHO - 170]]);
    };
    const doble = (e1: string, v1: string, e2: string, v2: string) => {
      y = this.fila(doc, y, [[e1, 110], [v1, 146], [e2, 110], [v2, 146]]);
    };

    completa('Persona servidora pública:', `${p.nombre} - ${p.rfc}`);
    completa('Dependencia:', p.dependencia);
    completa('Dirección:', p.direccion);
    completa('Departamento:', p.departamento);
    doble('Tipo de permiso:', p.tipoNombre, 'Fecha del permiso:', p.fecha);
    doble('Permiso:', estadoTexto(p), 'Regresa:', p.regresa ? 'Sí' : 'No');
    doble(
      'Salida solicitada:',
      p.horaSalida,
      'Entrada solicitada:',
      p.regresa ? (p.horaRegreso ?? 'No hay registro') : 'No regresa',
    );
    doble(
      'Salida registrada:',
      p.salidaRegistrada ?? 'Sin registro',
      'Entrada registrada:',
      p.regresa ? (p.entradaRegistrada ?? 'Sin registro') : 'No regresa',
    );

    if (p.tipo === TIPO_LABORAL) {
      completa('Origen:', p.origen);
      for (const destino of p.destinos) {
        y = this.fila(doc, y, [
          ['Destino:', 60],
          [destino.nombre, 212],
          ['Entrada:', 50],
          [destino.entrada ?? 'Sin registro', 70],
          ['Salida:', 50],
          [destino.salida ?? 'Sin registro', 70],
        ]);
      }
    }

    const firma = Math.max(y + 50, 520);
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('ATENTAMENTE', MARGEN, firma, { width: ANCHO, align: 'center' });
    doc
      .moveTo(MARGEN + 130, firma + 58)
      .lineTo(MARGEN + ANCHO - 130, firma + 58)
      .strokeColor('#1E1619')
      .lineWidth(0.5)
      .stroke();
    doc.text(p.nombre, MARGEN, firma + 64, { width: ANCHO, align: 'center' });
  }

  /** Una fila de celdas [texto, ancho]; las posiciones impares son etiquetas y van en negritas. */
  private fila(doc: PDFKit.PDFDocument, y: number, celdas: [string, number][]): number {
    doc.fontSize(8);
    const alto =
      Math.max(
        ...celdas.map(([texto, ancho], i) =>
          doc.font(i % 2 === 0 ? 'Helvetica-Bold' : 'Helvetica').heightOfString(texto, { width: ancho - 10 }),
        ),
      ) + 9;
    let x = MARGEN;
    celdas.forEach(([texto, ancho], i) => {
      doc.rect(x, y, ancho, alto).strokeColor(LINEA).lineWidth(0.5).stroke();
      doc
        .font(i % 2 === 0 ? 'Helvetica-Bold' : 'Helvetica')
        .fillColor('#1E1619')
        .text(texto, x + 5, y + 4.5, { width: ancho - 10 });
      x += ancho;
    });
    return y + alto;
  }
}

function estadoTexto(p: PermisoVista): string {
  if (p.estado === 'aprobado') return `Aprobado el ${p.resueltoEl ?? ''}`.trim();
  if (p.estado === 'denegado') return `Denegado el ${p.resueltoEl ?? ''}`.trim();
  return 'Pendiente';
}
