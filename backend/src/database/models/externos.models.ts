import { Column, DataType, Model, Table } from 'sequelize-typescript';

/** Edificios (base del directorio). Solo lectura. */
@Table({ tableName: 'ubicaciones', timestamps: false })
export class Ubicacion extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true })
  declare id: number;

  @Column({ type: DataType.STRING, allowNull: true })
  declare nombre: string;

  @Column({ type: DataType.DATE, allowNull: true })
  declare deleted_at: Date | null;
}

/** Transacción cruda del biométrico (base de checadores). Solo lectura. */
@Table({ tableName: 'iclock_transaction', timestamps: false })
export class TransaccionChecador extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true })
  declare id: number;

  @Column({ type: DataType.STRING, allowNull: true })
  declare emp_code: string;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare terminal_id: number;

  @Column({ type: DataType.DATE, allowNull: true })
  declare punch_time: Date;

  @Column({ type: DataType.STRING, allowNull: true })
  declare terminal_alias: string;
}

/** Empleado del biométrico. Ojo: su `first_name` guarda el RFC, no el nombre. */
@Table({ tableName: 'personnel_employee', timestamps: false })
export class EmpleadoChecador extends Model {
  @Column({ type: DataType.STRING, primaryKey: true })
  declare emp_code: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare first_name: string;
}
