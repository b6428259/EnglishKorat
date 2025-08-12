/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('courses', (table) => {
      table.increments('id').primary();
      table.string('name', 200).notNullable();
      table.string('code', 50).notNullable().unique();
      table.enum('course_type', [
        'conversation_kids', 'conversation_adults', 'english_4skills',
        'ielts_prep', 'toeic_prep', 'toefl_prep',
        'chinese_conversation', 'chinese_4skills'
      ]).notNullable();
      table.integer('branch_id').unsigned().notNullable().references('id').inTable('branches');
      table.integer('max_students').unsigned().defaultTo(8);
      table.decimal('price', 10, 2).notNullable();
      table.integer('hours_total').unsigned().notNullable();
      table.text('payment_terms'); // JSON for payment installment info
      table.text('description');
      table.enum('status', ['active', 'inactive']).defaultTo('active');
      table.timestamps(true, true);
    })
    .createTable('rooms', (table) => {
      table.increments('id').primary();
      table.integer('branch_id').unsigned().notNullable().references('id').inTable('branches');
      table.string('room_name', 50).notNullable();
      table.integer('capacity').unsigned().notNullable();
      table.text('equipment'); // JSON for equipment list
      table.enum('status', ['available', 'maintenance', 'unavailable']).defaultTo('available');
      table.timestamps(true, true);
      table.unique(['branch_id', 'room_name']);
    })
    .createTable('course_groups', (table) => {
      table.increments('id').primary();
      table.integer('course_id').unsigned().notNullable().references('id').inTable('courses');
      table.string('group_name', 100);
      table.integer('teacher_id').unsigned().references('id').inTable('teachers');
      table.integer('room_id').unsigned().references('id').inTable('rooms');
      table.integer('current_students').unsigned().defaultTo(0);
      table.enum('status', ['waiting_for_group', 'ready_to_active', 'in_progress', 'completed', 'cancelled']).defaultTo('waiting_for_group');
      table.date('start_date');
      table.date('end_date');
      table.integer('admin_assigned').unsigned().references('id').inTable('users');
      table.timestamps(true, true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('course_groups')
    .dropTableIfExists('rooms')
    .dropTableIfExists('courses');
};