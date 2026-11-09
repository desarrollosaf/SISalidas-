'use strict';

/**
 * Tablas heredadas del sistema Laravel. En el servidor ya existen y esta migración no las toca;
 * solo las crea en un ambiente nuevo (local o pruebas).
 *
 * id_salida e id_entrada de `registros` no aparecen en las migraciones de Laravel aunque su código
 * sí los usa: si faltaran en una base restaurada, se agregan aquí.
 */
const tiempos = (Sequelize) => ({
  created_at: { type: Sequelize.DATE, allowNull: true },
  updated_at: { type: Sequelize.DATE, allowNull: true },
});

const id = (Sequelize) => ({
  type: Sequelize.BIGINT.UNSIGNED,
  primaryKey: true,
  autoIncrement: true,
  allowNull: false,
});

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const existentes = (await queryInterface.showAllTables()).map((t) =>
      String(t.tableName ?? t).toLowerCase(),
    );
    const crear = async (tabla, columnas) => {
      if (!existentes.includes(tabla)) await queryInterface.createTable(tabla, columnas);
    };

    await crear('registros', {
      id: id(Sequelize),
      rfc_usuario: { type: Sequelize.STRING, allowNull: false },
      fecha_permiso: { type: Sequelize.DATEONLY, allowNull: false },
      hora_salida: { type: Sequelize.TIME, allowNull: false },
      hora_regreso: { type: Sequelize.TIME, allowNull: true },
      aprobacion: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
      hora_aprobacion: { type: Sequelize.DATE, allowNull: true },
      regresa: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
      tipo_permiso: { type: Sequelize.INTEGER, allowNull: true },
      folio: { type: Sequelize.INTEGER, allowNull: true },
      origen: { type: Sequelize.INTEGER, allowNull: true },
      status: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 1 },
      id_salida: { type: Sequelize.INTEGER, allowNull: true },
      id_entrada: { type: Sequelize.INTEGER, allowNull: true },
      ...tiempos(Sequelize),
    });

    // Una base restaurada de Laravel podría no traerlas.
    const columnas = await queryInterface.describeTable('registros');
    for (const columna of ['id_salida', 'id_entrada']) {
      if (!columnas[columna]) {
        await queryInterface.addColumn('registros', columna, {
          type: Sequelize.INTEGER,
          allowNull: true,
        });
      }
    }

    await crear('destinos', {
      id: id(Sequelize),
      idRegistro: { type: Sequelize.INTEGER, allowNull: false },
      idDestino: { type: Sequelize.INTEGER, allowNull: false },
      idEntrada: { type: Sequelize.INTEGER, allowNull: true },
      idSalida: { type: Sequelize.INTEGER, allowNull: true },
      checador: { type: Sequelize.STRING, allowNull: true },
      otroDestino: { type: Sequelize.TEXT('long'), allowNull: true },
      status: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 1 },
      ...tiempos(Sequelize),
    });

    await crear('folios', {
      id: id(Sequelize),
      rfcUs: { type: Sequelize.STRING, allowNull: false },
      folio: { type: Sequelize.INTEGER, allowNull: false },
      tipo_permiso: { type: Sequelize.INTEGER, allowNull: false },
      ...tiempos(Sequelize),
    });

    await crear('especials', {
      id: id(Sequelize),
      rfc_usuario: { type: Sequelize.STRING, allowNull: false },
      id_Direccion: { type: Sequelize.STRING, allowNull: true },
      id_Departamento: { type: Sequelize.STRING, allowNull: true },
      rango: { type: Sequelize.STRING, allowNull: true },
      status: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 1 },
      ...tiempos(Sequelize),
    });

    await crear('iclock_transactions', {
      id: id(Sequelize),
      id_checador: { type: Sequelize.STRING, allowNull: true },
      emp_code: { type: Sequelize.STRING, allowNull: true },
      terminal_id: { type: Sequelize.INTEGER, allowNull: true },
      punch_time: { type: Sequelize.DATE, allowNull: true },
      punch_state: { type: Sequelize.STRING, allowNull: true },
      terminal_alias: { type: Sequelize.STRING, allowNull: true },
      rfc_usuario: { type: Sequelize.STRING, allowNull: true },
      fecha_registro: { type: Sequelize.DATEONLY, allowNull: true },
      status: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 1 },
      ...tiempos(Sequelize),
    });
  },

  // No se borran: en el servidor son las tablas con los datos reales del sistema Laravel.
  async down() {},
};
