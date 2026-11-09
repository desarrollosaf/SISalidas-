import { Column, DataType, Model, Table } from 'sequelize-typescript';

/**
 * Padrón centralizado. Estas tablas son de otros sistemas: se declaran solo las columnas que el
 * sistema Laravel ya usaba, para no depender de ninguna otra. Aquí únicamente se escribe la
 * contraseña (users_safs) y los datos de contacto (s_datosGeneralesUsr).
 */

/** Cuentas para entrar. */
@Table({ tableName: 'users_safs', timestamps: false })
export class UsersSafs extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING, allowNull: true })
  declare name: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare email: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare rfc: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare password: string;
}

/** Personas: N_Usuario es el RFC. */
@Table({ tableName: 's_usuario', timestamps: false })
export class SUsuario extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id_Usuario: number;

  @Column({ type: DataType.STRING, allowNull: true })
  declare N_Usuario: string;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare id_Dependencia: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare id_Direccion: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare id_Departamento: number | null;

  @Column({ type: DataType.TEXT, allowNull: false })
  declare Nombre: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare C_Electronico: string | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare Estado: number;
}

/** Nivel jerárquico. Se declara `username` como llave porque este modelo nunca escribe. */
@Table({ tableName: 's_users', timestamps: false })
export class SUsers extends Model {
  @Column({ type: DataType.STRING, primaryKey: true })
  declare username: string;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare rango: number | null;
}

@Table({ tableName: 't_dependencia', timestamps: false })
export class TDependencia extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true })
  declare id_Dependencia: number;

  @Column({ type: DataType.STRING, allowNull: true })
  declare Nombre: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare nombre_completo: string | null;
}

@Table({ tableName: 't_direccion', timestamps: false })
export class TDireccion extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true })
  declare id_Direccion: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare id_Dependencia: number | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare Nombre: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare nombre_completo: string | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare Estado: number | null;
}

@Table({ tableName: 't_departamento', timestamps: false })
export class TDepartamento extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true })
  declare id_Departamento: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare id_Dependencia: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare id_Direccion: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare c_presup: number | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare Nombre: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare nombre_completo: string | null;
}

/** Datos de contacto que captura cada persona; de aquí sale su correo de avisos. */
@Table({ tableName: 's_datosGeneralesUsr', createdAt: 'created_at', updatedAt: 'updated_at' })
export class DatosGenerales extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING, allowNull: true })
  declare rfc_usuario: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare email: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare celular: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare telefono: string | null;
}
