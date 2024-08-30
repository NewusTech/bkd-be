'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Layanan_form_inputs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      data: {
        type: Sequelize.STRING
      },
      layananform_id: {
        type: Sequelize.INTEGER
      },
      layananformnum_id: {
        type: Sequelize.INTEGER
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    await queryInterface.addConstraint('Layanan_form_inputs', {
      fields: ['layananform_id'],
      type: 'foreign key',
      name: 'custom_fkey_layananform_id',
      references: {
        table: 'Layanan_forms',
        field: 'id'
      }
    });

    await queryInterface.addConstraint('Layanan_form_inputs', {
      fields: ['layananformnum_id'],
      type: 'foreign key',
      name: 'custom_fkey_layananformnum_id',
      references: {
        table: 'Layanan_form_nums',
        field: 'id'
      }
    });
  },

  //untuk drop table ketika melakukan revert migrations
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Layanan_form_inputs');
  }
};