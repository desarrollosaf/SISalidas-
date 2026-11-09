import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Rol } from './rol.model';

@Table({ tableName: 'usuario_roles', underscored: true, timestamps: true })
export class UsuarioRol extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(20), allowNull: false, unique: true })
  declare rfc: string;

  @ForeignKey(() => Rol)
  @Column({ type: DataType.INTEGER, allowNull: false, field: 'rol_id' })
  declare rolId: number;

  @BelongsTo(() => Rol)
  declare rol: Rol;
}
