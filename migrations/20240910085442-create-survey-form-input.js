'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Survey_form_inputs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      nilai: {
        type: Sequelize.SMALLINT
      },
      surveyform_id: {
        type: Sequelize.INTEGER
      },
      surveyformnum_id: {
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

    await queryInterface.addConstraint('Survey_form_inputs', {
      fields: ['surveyform_id'],
      type: 'foreign key',
      name: 'custom_fkey_surveyform_id',
      references: {
        table: 'Survey_forms',
        field: 'id'
      }
    });

    await queryInterface.addConstraint('Survey_form_inputs', {
      fields: ['surveyformnum_id'],
      type: 'foreign key',
      name: 'custom_fkey_surveyformnum_id',
      references: {
        table: 'Survey_form_nums',
        field: 'id'
      }
    });
  },

  //untuk drop table ketika melakukan revert migrations
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Survey_form_inputs');
  }
};