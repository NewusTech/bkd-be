'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Userpermissions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      permission_id: {
        type: Sequelize.INTEGER,
        allowNull: false
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

    await queryInterface.addConstraint('Userpermissions', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'custom_fkey_user_id23',
      references: {
        table: 'Users',
        field: 'id'
      }
    });

    await queryInterface.addConstraint('Userpermissions', {
      fields: ['permission_id'],
      type: 'foreign key',
      name: 'custom_fkey_permission_id11',
      references: {
        table: 'Permissions',
        field: 'id'
      }
    });

  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Userpermissions');
  }
};