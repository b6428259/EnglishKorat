/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('enrollments', (table) => {
      table.increments('id').primary();
      table.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
      table.integer('course_id').unsigned().notNullable().references('id').inTable('courses');
      table.integer('course_group_id').unsigned().references('id').inTable('course_groups');
      table.date('enrollment_date').notNullable();
      table.enum('payment_status', ['pending', 'partial', 'completed', 'overdue']).defaultTo('pending');
      table.decimal('total_amount', 10, 2).notNullable();
      table.decimal('paid_amount', 10, 2).defaultTo(0);
      table.integer('leave_credits').defaultTo(0); // Number of leaves allowed
      table.integer('used_leaves').defaultTo(0);
      table.enum('status', ['active', 'completed', 'cancelled', 'suspended']).defaultTo('active');
      table.text('notes');
      table.timestamps(true, true);
    })
    .createTable('classes', (table) => {
      table.increments('id').primary();
      table.integer('course_group_id').unsigned().notNullable().references('id').inTable('course_groups');
      table.integer('teacher_id').unsigned().notNullable().references('id').inTable('teachers');
      table.integer('room_id').unsigned().notNullable().references('id').inTable('rooms');
      table.date('class_date').notNullable();
      table.time('start_time').notNullable();
      table.time('end_time').notNullable();
      table.decimal('hours', 3, 1).notNullable();
      table.enum('status', ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled']).defaultTo('scheduled');
      table.text('notes');
      table.timestamps(true, true);
    })
    .createTable('class_attendances', (table) => {
      table.increments('id').primary();
      table.integer('class_id').unsigned().notNullable().references('id').inTable('classes').onDelete('CASCADE');
      table.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
      table.enum('status', ['present', 'absent', 'excused', 'late']).defaultTo('present');
      table.text('notes');
      table.timestamps(true, true);
      table.unique(['class_id', 'student_id']);
    })
    .createTable('student_leaves', (table) => {
      table.increments('id').primary();
      table.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
      table.integer('class_id').unsigned().notNullable().references('id').inTable('classes');
      table.text('reason').notNullable();
      table.datetime('requested_at').notNullable();
      table.enum('status', ['pending', 'approved', 'rejected']).defaultTo('pending');
      table.integer('approved_by').unsigned().references('id').inTable('users');
      table.datetime('approved_at');
      table.text('admin_notes');
      table.timestamps(true, true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('student_leaves')
    .dropTableIfExists('class_attendances')
    .dropTableIfExists('classes')
    .dropTableIfExists('enrollments');
};