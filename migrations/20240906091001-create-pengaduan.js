'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Pengaduans', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      judul_pengaduan: {
        type: Sequelize.STRING
      },
      isi_pengaduan: {
        type: Sequelize.TEXT
      },
      jawaban: {
        type: Sequelize.TEXT
      },
      image: {
        type: Sequelize.STRING
      },
      bidang_id: {
        type: Sequelize.INTEGER
      },
      layanan_id: {
        type: Sequelize.INTEGER
      },
      userinfo_id: {
        type: Sequelize.INTEGER
      },
      status: {
        type: Sequelize.SMALLINT
      },
      updated_by: {
        allowNull: false,
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

    await queryInterface.addConstraint('Pengaduans', {
      fields: ['layanan_id'],
      type: 'foreign key',
      name: 'custom_fkey_layanan_id8',
      references: {
        table: 'Layanans',
        field: 'id'
      }
    });

    await queryInterface.addConstraint('Pengaduans', {
      fields: ['bidang_id'],
      type: 'foreign key',
      name: 'custom_fkey_bidang_id8',
      references: {
        table: 'Bidangs',
        field: 'id'
      }
    });

    await queryInterface.addConstraint('Pengaduans', {
      fields: ['userinfo_id'],
      type: 'foreign key',
      name: 'custom_fkey_userinfo_id8',
      references: {
        table: 'User_infos',
        field: 'id'
      }
    });

    await queryInterface.addConstraint('Pengaduans', {
      fields: ['updated_by'],
      type: 'foreign key',
      name: 'custom_fkey_updated_by01', 
      references: {
        table: 'User_infos',
        field: 'id'
      }
    });
  },

  //untuk drop table ketika melakukan revert migrations
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Pengaduans');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('Pengaduans', 'custom_fkey_updated_by01');

    await queryInterface.removeColumn('Pengaduans', 'updated_by');
  }
};