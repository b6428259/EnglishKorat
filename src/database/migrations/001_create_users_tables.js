/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('branches', (table) => {
      table.increments('id').primary();
      table.string('name', 100).notNullable();
      table.string('code', 10).notNullable().unique();
      table.text('address');
      table.string('phone', 20);
      table.string('type', 20).notNullable().defaultTo('offline'); // 'offline', 'online'
      table.boolean('active').defaultTo(true);
      table.timestamps(true, true);
    })
    .createTable('users', (table) => {
      table.increments('id').primary();
      table.string('username', 50).notNullable().unique();
      table.string('password').notNullable();
      table.string('email', 100).unique();
      table.string('phone', 20);
      table.string('line_id', 50);
      table.enum('role', ['student', 'teacher', 'admin', 'owner']).notNullable();
      table.integer('branch_id').unsigned().references('id').inTable('branches');
      table.enum('status', ['active', 'inactive', 'suspended']).defaultTo('active');
      table.timestamps(true, true);
    })
    .createTable('students', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
      table.string('first_name', 100).notNullable();
      table.string('last_name', 100).notNullable();
      table.string('nickname', 50);
      table.integer('age');
      table.string('grade_level', 20);
      table.string('cefr_level', 10); // A1, A2, B1, B2, C1, C2
      table.integer('grammar_score').unsigned();
      table.integer('speaking_score').unsigned();
      table.integer('listening_score').unsigned();
      table.text('learning_preferences'); // JSON string for preferences
      table.string('preferred_teacher_type', 20); // 'thai', 'foreign', 'any'
      table.text('contact_source'); // How they found us
      table.string('admin_contact', 100); // Admin who contacted them
      table.timestamps(true, true);
    })
    .createTable('teachers', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
      table.string('first_name', 100).notNullable();
      table.string('last_name', 100).notNullable();
      table.string('nickname', 50);
      table.string('nationality', 50);
      table.string('teacher_type', 20).notNullable(); // 'thai', 'foreign'
      table.decimal('hourly_rate', 8, 2);
      table.text('specializations'); // JSON array of course types they can teach
      table.text('certifications');
      table.boolean('active').defaultTo(true);
      table.timestamps(true, true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('teachers')
    .dropTableIfExists('students')
    .dropTableIfExists('users')
    .dropTableIfExists('branches');
};