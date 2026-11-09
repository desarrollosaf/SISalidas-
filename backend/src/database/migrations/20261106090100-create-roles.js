'use strict';

/** Roles propios de SISalidas; sustituyen a las listas de RFC que Laravel tenía en el código. */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tiempos = {
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    };
    await queryInterface.createTable('roles', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      clave: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(50), allowNull: false },
      ...tiempos,
    });
    await queryInterface.createTable('usuario_roles', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      rfc: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      rol_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'roles', key: 'id' },
        onDelete: 'CASCADE',
      },
      ...tiempos,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('usuario_roles');
    await queryInterface.dropTable('roles');
  },
};
