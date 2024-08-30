'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Layanan_form_nums', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userinfo_id: {
        type: Sequelize.INTEGER
      },
      layanan_id: {
        type: Sequelize.INTEGER
      },
      isonline: {
        type: Sequelize.BOOLEAN
      },
      fileoutput: {
        type: Sequelize.STRING
      },
      pesan: {
        type: Sequelize.STRING
      },
      tgl_selesai: {
        type: Sequelize.DATEONLY
      },
      status: {
        type: Sequelize.SMALLINT
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

    await queryInterface.addConstraint('Layanan_form_nums', {
      fields: ['userinfo_id'],
      type: 'foreign key',
      name: 'custom_fkey_user_info_id',
      references: {
        table: 'User_infos',
        field: 'id'
      }
    });

    await queryInterface.addConstraint('Layanan_form_nums', {
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
    await queryInterface.dropTable('Layanan_form_nums');
  }
};