'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Pengaduans', 'admin_id', {
      type: Sequelize.INTEGER
    });

    await queryInterface.addConstraint('Pengaduans', {
      fields: ['admin_id'],
      type: 'foreign key',
      name: 'custom_fkey_admin_id01', 
      references: {
        table: 'User_infos',
        field: 'id'
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('Pengaduans', 'custom_fkey_admin_id01');

    await queryInterface.removeColumn('Pengaduans', 'admin_id');
  }
};
