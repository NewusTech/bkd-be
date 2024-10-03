'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      password: {
        type: Sequelize.STRING
      },
      slug: {
        type: Sequelize.STRING,
        unique: true
      },
      role_id: {
        type: Sequelize.INTEGER
      },
      userinfo_id: {
        type: Sequelize.INTEGER
      },
      bidang_id: {
        type: Sequelize.INTEGER
      },
      layanan_id: {
        type: Sequelize.INTEGER
      },
      userkepangkatan_id: {
        type: Sequelize.INTEGER
      },
      userjabatan_id: {
        type: Sequelize.INTEGER
      },
      userpendidikan_id: {
        type: Sequelize.INTEGER
      },
      userkgb_id: {
        type: Sequelize.INTEGER
      },
      userpenghargaan_id: {
        type: Sequelize.INTEGER
      },
      userpelatihan_id: {
        type: Sequelize.INTEGER
      },
      userspouse_id: {
        type: Sequelize.INTEGER
      },
      userdescendant_id: {
        type: Sequelize.INTEGER
      },
      resetpasswordtoken: {
        type: Sequelize.STRING
      },
      resetpasswordexpires: {
        type: Sequelize.DATE
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      deletedAt: {
        type: Sequelize.DATE
      }
    });

    await queryInterface.addConstraint('Users', {
      fields: ['bidang_id'],
      type: 'foreign key',
      name: 'custom_fkey_bidang_id1',
      references: {
        table: 'Bidangs',
        field: 'id'
      }
    });

    await queryInterface.addConstraint('Users', {
      fields: ['layanan_id'],
      type: 'foreign key',
      name: 'custom_fkey_layanan_id11',
      references: {
        table: 'Layanans',
        field: 'id'
      }
    });

    await queryInterface.addConstraint('Users', {
      fields: ['userinfo_id'],
      type: 'foreign key',
      name: 'custom_fkey_userinfo_id',
      references: {
        table: 'User_infos',
        field: 'id'
      }
    });

    await queryInterface.addConstraint('Users', {
      fields: ['role_id'],
      type: 'foreign key',
      name: 'custom_fkey_role_id',
      references: {
        table: 'Roles',
        field: 'id'
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('User_permissions');
    await queryInterface.dropTable('Users');
  }
};