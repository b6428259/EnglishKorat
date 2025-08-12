/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('teaching_reports', (table) => {
      table.increments('id').primary();
      table.integer('class_id').unsigned().notNullable().references('id').inTable('classes').onDelete('CASCADE');
      table.integer('teacher_id').unsigned().notNullable().references('id').inTable('teachers');
      table.date('class_date').notNullable();
      table.decimal('hours', 3, 1).notNullable();
      table.text('warm_up');
      table.text('topic').notNullable();
      table.text('activities').notNullable();
      table.text('outcomes').notNullable();
      table.text('homework');
      table.text('next_plan');
      table.string('last_page', 50);
      table.string('cefr_level', 10);
      table.text('skill_scores'); // JSON for grammar, speaking, listening scores
      table.text('images'); // JSON array of image URLs/paths
      table.datetime('submitted_at').notNullable();
      table.boolean('payment_calculated').defaultTo(false);
      table.decimal('teacher_payment', 8, 2);
      table.timestamps(true, true);
      table.unique(['class_id']); // One report per class
    })
    .createTable('bills', (table) => {
      table.increments('id').primary();
      table.integer('student_id').unsigned().notNullable().references('id').inTable('students');
      table.integer('enrollment_id').unsigned().notNullable().references('id').inTable('enrollments');
      table.string('bill_number', 50).notNullable().unique();
      table.decimal('amount', 10, 2).notNullable();
      table.decimal('discount', 10, 2).defaultTo(0);
      table.decimal('total_amount', 10, 2).notNullable();
      table.enum('bill_type', ['full_payment', 'installment', 'deposit']).notNullable();
      table.date('due_date');
      table.enum('status', ['pending', 'paid', 'overdue', 'cancelled']).defaultTo('pending');
      table.text('notes');
      table.timestamps(true, true);
    })
    .createTable('payments', (table) => {
      table.increments('id').primary();
      table.integer('bill_id').unsigned().notNullable().references('id').inTable('bills');
      table.integer('student_id').unsigned().notNullable().references('id').inTable('students');
      table.decimal('amount', 10, 2).notNullable();
      table.enum('payment_method', ['cash', 'credit_card', 'bank_transfer', 'line_pay']).notNullable();
      table.decimal('processing_fee', 8, 2).defaultTo(0); // 3% for credit card
      table.string('transaction_id', 100);
      table.string('slip_image'); // Path to slip verification image
      table.datetime('payment_date').notNullable();
      table.enum('verification_status', ['pending', 'verified', 'rejected']).defaultTo('pending');
      table.integer('verified_by').unsigned().references('id').inTable('users');
      table.datetime('verified_at');
      table.text('verification_notes');
      table.timestamps(true, true);
    })
    .createTable('student_documents', (table) => {
      table.increments('id').primary();
      table.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
      table.string('document_type', 50).notNullable(); // 'id_card', 'contract', 'photo', etc.
      table.string('original_name', 255).notNullable();
      table.string('file_path', 500).notNullable();
      table.string('file_size', 20);
      table.string('mime_type', 100);
      table.datetime('uploaded_at').notNullable();
      table.integer('uploaded_by').unsigned().references('id').inTable('users');
      table.timestamps(true, true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('student_documents')
    .dropTableIfExists('payments')
    .dropTableIfExists('bills')
    .dropTableIfExists('teaching_reports');
};