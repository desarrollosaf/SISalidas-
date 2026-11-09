import { Column, DataType, Model, Table } from 'sequelize-typescript';

/**
 * Tablas heredadas del sistema Laravel, en la base principal. Conservan sus nombres de columna
 * tal cual porque ambos sistemas las comparten durante la transición.
 */
const TIEMPOS = { createdAt: 'created_at', updatedAt: 'updated_at' };

/** Una solicitud de permiso de salida. */
@Table({ tableName: 'registros', ...TIEMPOS })
export class Registro extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  declare rfc_usuario: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  declare fecha_permiso: string;

  @Column({ type: DataType.TIME, allowNull: false })
  declare hora_salida: string;

  @Column({ type: DataType.TIME, allowNull: true })
  declare hora_regreso: string | null;

  /** 0 = pendiente, 1 = aprobado, 2 = denegado. */
  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  declare aprobacion: number;

  @Column({ type: DataType.DATE, allowNull: true })
  declare hora_aprobacion: Date | null;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  declare regresa: number;

  /** 1 = personal, 2 = laboral, 3 = comida. */
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare tipo_permiso: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare folio: number;

  /** ubicaciones.id del edificio de salida (solo permisos laborales). */
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare origen: number | null;

  /** 1 = activo, 0 = cerrado. */
  @Column({ type: DataType.INTEGER, defaultValue: 1 })
  declare status: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare id_salida: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare id_entrada: number | null;

  declare created_at: Date;
}

/** Cada edificio de destino de un permiso laboral. idDestino 999 = "otro" (texto libre). */
@Table({ tableName: 'destinos', ...TIEMPOS })
export class Destino extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare idRegistro: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare idDestino: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare idEntrada: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare idSalida: number | null;

  @Column({ type: DataType.TEXT('long'), allowNull: true })
  declare otroDestino: string | null;

  @Column({ type: DataType.INTEGER, defaultValue: 1 })
  declare status: number;
}

/** Consecutivo de solicitudes por persona y tipo de permiso. */
@Table({ tableName: 'folios', ...TIEMPOS })
export class Folio extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  declare rfcUs: string;

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare folio: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare tipo_permiso: number;
}

/** Validador especial: alguien que valida los permisos de un departamento que no es el suyo. */
@Table({ tableName: 'especials', ...TIEMPOS })
export class Especial extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  declare rfc_usuario: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare id_Direccion: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare id_Departamento: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare rango: string | null;

  @Column({ type: DataType.INTEGER, defaultValue: 1 })
  declare status: number;
}

/**
 * Checada ya procesada: copia de la transacción del biométrico que le pertenece a un permiso.
 * punch_state: '5' = salida, '4' = entrada.
 */
@Table({ tableName: 'iclock_transactions', ...TIEMPOS })
export class ChecadaRegistrada extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING, allowNull: true })
  declare id_checador: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare emp_code: string;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare terminal_id: number;

  @Column({ type: DataType.DATE, allowNull: true })
  declare punch_time: Date;

  @Column({ type: DataType.STRING, allowNull: true })
  declare punch_state: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare terminal_alias: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare rfc_usuario: string;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  declare fecha_registro: string;

  @Column({ type: DataType.INTEGER, defaultValue: 1 })
  declare status: number;
}
