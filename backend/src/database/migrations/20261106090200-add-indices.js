'use strict';

/** Índices para las consultas de bandejas, reportes y checadas. Laravel no definía ninguno. */
const INDICES = [
  ['registros', ['rfc_usuario', 'status'], 'idx_registros_rfc_status'],
  ['registros', ['fecha_permiso'], 'idx_registros_fecha'],
  ['destinos', ['idRegistro'], 'idx_destinos_registro'],
  ['iclock_transactions', ['id_checador'], 'idx_iclock_checador'],
  ['iclock_transactions', ['rfc_usuario', 'fecha_registro'], 'idx_iclock_rfc_fecha'],
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    for (const [tabla, campos, name] of INDICES) {
      const existentes = await queryInterface.showIndex(tabla);
      if (!existentes.some((i) => i.name === name)) {
        await queryInterface.addIndex(tabla, campos, { name });
      }
    }
  },

  async down(queryInterface) {
    for (const [tabla, , name] of INDICES) {
      await queryInterface.removeIndex(tabla, name);
    }
  },
};
