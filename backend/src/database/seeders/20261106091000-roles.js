'use strict';

const ROLES = [
  { clave: 'administrador', nombre: 'Administrador' },
  { clave: 'reporte_general', nombre: 'Reporte general' },
  { clave: 'acceso_externo', nombre: 'Acceso sin ser de OSFEM' },
];

/**
 * Las mismas personas que Laravel tenía fijas por RFC:
 * - administrador: "Rol de usuarios" (sidebar.blade.php). DIRG940621 también veía el reporte
 *   general y entraba sin ser de OSFEM; administrador ya incluye ambas cosas.
 * - reporte_general: "Reporte General" (sidebar.blade.php).
 * - acceso_externo: entran sin pertenecer a la dependencia 3 (HomeController).
 */
const ASIGNACIONES = [
  ['DOOJ900120', 'administrador'],
  ['DIRG940621', 'administrador'],
  ['CACM800313', 'administrador'],
  ['LORV680521', 'reporte_general'],
  ['BUPN870624', 'reporte_general'],
  ['DEGC941209', 'acceso_externo'],
  ['SAGM990220', 'acceso_externo'],
  ['JISP980721', 'acceso_externo'],
];

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface) {
    const ahora = new Date();
    await queryInterface.bulkInsert(
      'roles',
      ROLES.map((r) => ({ ...r, created_at: ahora, updated_at: ahora })),
      { ignoreDuplicates: true },
    );
    const [roles] = await queryInterface.sequelize.query('SELECT id, clave FROM roles');
    const idPorClave = new Map(roles.map((r) => [r.clave, r.id]));
    await queryInterface.bulkInsert(
      'usuario_roles',
      ASIGNACIONES.map(([rfc, clave]) => ({
        rfc,
        rol_id: idPorClave.get(clave),
        created_at: ahora,
        updated_at: ahora,
      })),
      { ignoreDuplicates: true },
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('usuario_roles', { rfc: ASIGNACIONES.map(([rfc]) => rfc) });
    await queryInterface.bulkDelete('roles', { clave: ROLES.map((r) => r.clave) });
  },
};
