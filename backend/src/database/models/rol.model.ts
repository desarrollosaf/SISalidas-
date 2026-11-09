import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { UsuarioRol } from './usuario-rol.model';

@Table({ tableName: 'roles', underscored: true, timestamps: true })
export class Rol extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(20), allowNull: false, unique: true })
  declare clave: string;

  @Column({ type: DataType.STRING(50), allowNull: false })
  declare nombre: string;

  @HasMany(() => UsuarioRol)
  declare asignaciones: UsuarioRol[];
}
