'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Layanan_surats', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      layanan_id: {
        type: Sequelize.INTEGER
      },
      header: {
        type: Sequelize.TEXT
      },
      nomor: {
        type: Sequelize.STRING
      },
      perihal: {
        type: Sequelize.TEXT
      },
      body: {
        type: Sequelize.TEXT
      },
      catatan: {
        type: Sequelize.TEXT
      },
      tembusan: {
        type: Sequelize.TEXT
      },
      footer: {
        type: Sequelize.TEXT
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

    await queryInterface.addConstraint('Layanan_surats', {
      fields: ['layanan_id'],
      type: 'foreign key',
      name: 'custom_fkey_layanan_idsurat',
      references: {
        table: 'Layanans',
        field: 'id'
      }
    });
  },

  //untuk drop table ketika melakukan revert migrations
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Layanan_surats');
  }
};