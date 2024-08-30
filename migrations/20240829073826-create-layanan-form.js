'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Layanan_forms', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      layanan_id: {
        type: Sequelize.INTEGER
      },
      field: {
        type: Sequelize.STRING
      },
      tipedata: {
        type: Sequelize.STRING
      },
      datajson: {
        type: Sequelize.JSON
      },
      maxinput: {
        type: Sequelize.INTEGER
      },
      mininput: {
        type: Sequelize.INTEGER
      },
      isrequired: {
        type: Sequelize.BOOLEAN
      },
      status: {
        type: Sequelize.BOOLEAN
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

    await queryInterface.addConstraint('Layanan_forms', {
      fields: ['layanan_id'],
      type: 'foreign key',
      name: 'custom_fkey_layanan_id',
      references: {
        table: 'Layanans',
        field: 'id'
      }
    });
  },

  //untuk drop table ketika melakukan revert migrations
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Layanan_forms');
  }
};