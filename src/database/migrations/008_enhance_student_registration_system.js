/**
 * Enhancement Migration for Student Registration and Group Management System
 * This migration adds the missing fields and tables required for the comprehensive
 * student management system as described in the requirements.
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Enhance students table with registration flow fields
    .alterTable('students', (table) => {
      table.enum('age_group', ['kids', 'students', 'adults']).after('age'); // Derived from age: ≤Grade 6, Grade 7+, 17+
      table.integer('reading_score').unsigned().after('listening_score'); // Missing CEFR score
      table.integer('writing_score').unsigned().after('reading_score'); // Missing CEFR score
      table.text('availability_schedule').after('learning_preferences'); // JSON: weekly schedule availability
      table.text('unavailable_times').after('availability_schedule'); // JSON: specific unavailable periods
      table.enum('registration_status', [
        'finding_group', 
        'has_group_members', 
        'ready_to_open_class', 
        'arranging_schedule', 
        'schedule_confirmed', 
        'class_started',
        'completed',
        'cancelled'
      ]).defaultTo('finding_group').after('contact_source');
      table.decimal('deposit_amount', 8, 2).defaultTo(0).after('registration_status');
      table.enum('payment_status', ['pending', 'partial', 'paid', 'refunded']).defaultTo('pending').after('deposit_amount');
      table.datetime('last_status_update').after('payment_status');
      table.integer('days_waiting').unsigned().defaultTo(0).after('last_status_update'); // For tracking 30+ day wait periods
    })

    // Enhance course_groups table for auto-grouping functionality
    .alterTable('course_groups', (table) => {
      table.integer('target_students').unsigned().defaultTo(6).after('current_students'); // Target group size (2-6)
      table.integer('min_students').unsigned().defaultTo(2).after('target_students'); // Minimum to start
      table.string('required_cefr_level', 10).after('group_name'); // Required CEFR level for group
      table.enum('required_age_group', ['kids', 'students', 'adults']).after('required_cefr_level'); // Required age group
      table.text('schedule_requirements').after('required_age_group'); // JSON: required schedule availability
      table.boolean('auto_formed').defaultTo(false).after('schedule_requirements'); // Whether auto-grouped or manually formed
      table.integer('group_leader_id').unsigned().references('id').inTable('students').after('auto_formed'); // For self-formed groups
      table.enum('formation_type', ['individual', 'self_formed', 'institute_arranged']).defaultTo('institute_arranged').after('group_leader_id');
      table.datetime('formation_deadline').after('formation_type'); // Deadline for group formation
    })

    // Enhance student_registrations table for comprehensive pre/post test process
    .alterTable('student_registrations', (table) => {
      table.enum('test_type', ['paper_based', 'online_cefr']).after('cefr_level'); // Kids use paper, adults use online
      table.text('test_evidence_files').after('test_type'); // JSON array of uploaded test evidence files (max 10 sheets for kids)
      table.integer('group_preference_id').unsigned().references('id').inTable('course_groups').after('course_id'); // For specific group requests
      table.enum('learning_option', ['individual', 'self_formed_group', 'institute_arranged']).defaultTo('institute_arranged').after('learning_goals');
      table.text('self_formed_group_members').after('learning_option'); // JSON array of member names/contacts for self-formed groups
      table.decimal('offered_discount', 8, 2).defaultTo(0).after('promotion_id'); // For 30+ day waiting discounts
      table.datetime('discount_valid_until').after('offered_discount');
    })

    // Group waiting list and auto-matching system
    .createTable('group_waiting_list', (table) => {
      table.increments('id').primary();
      table.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
      table.string('required_cefr_level', 10).notNullable();
      table.enum('required_age_group', ['kids', 'students', 'adults']).notNullable();
      table.text('available_schedule').notNullable(); // JSON of available time slots
      table.integer('preferred_group_size').unsigned().defaultTo(4);
      table.enum('priority', ['normal', 'high', 'urgent']).defaultTo('normal'); // Based on waiting time
      table.datetime('waiting_since').notNullable();
      table.integer('days_waiting').unsigned().defaultTo(0);
      table.boolean('active').defaultTo(true);
      table.timestamps(true, true);
    })

    // Schedule compatibility matrix for auto-grouping
    .createTable('schedule_slots', (table) => {
      table.increments('id').primary();
      table.enum('day_of_week', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).notNullable();
      table.time('start_time').notNullable();
      table.time('end_time').notNullable();
      table.string('slot_code', 20).notNullable().unique(); // e.g., 'MON_09_11', 'TUE_14_16'
      table.boolean('popular_slot').defaultTo(false); // For tracking popular time slots
      table.timestamps(true, true);
    })

    // Student schedule preferences
    .createTable('student_schedule_preferences', (table) => {
      table.increments('id').primary();
      table.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
      table.integer('schedule_slot_id').unsigned().notNullable().references('id').inTable('schedule_slots').onDelete('CASCADE');
      table.enum('preference_level', ['preferred', 'acceptable', 'not_available']).defaultTo('preferred');
      table.timestamps(true, true);
      table.unique(['student_id', 'schedule_slot_id']);
    })

    // Group formation history and tracking
    .createTable('group_formation_history', (table) => {
      table.increments('id').primary();
      table.integer('group_id').unsigned().notNullable().references('id').inTable('course_groups').onDelete('CASCADE');
      table.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
      table.enum('action', ['added', 'removed', 'status_changed']).notNullable();
      table.string('previous_status', 50);
      table.string('new_status', 50);
      table.text('reason');
      table.integer('performed_by').unsigned().references('id').inTable('users');
      table.boolean('auto_generated').defaultTo(false); // Whether action was performed by auto-grouping algorithm
      table.timestamps(true, true);
    })

    // Enhanced notification scheduling for automated updates
    .createTable('notification_schedules', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.enum('notification_type', [
        'daily_group_update', 'status_change', 'payment_reminder', 
        'schedule_confirmation', 'waiting_discount_offer'
      ]).notNullable();
      table.enum('frequency', ['daily', 'every_3_days', 'weekly', 'one_time']).notNullable();
      table.time('preferred_time').defaultTo('09:00:00'); // Default 09:00 as specified
      table.datetime('next_send_at').notNullable();
      table.datetime('last_sent_at');
      table.boolean('active').defaultTo(true);
      table.json('notification_data'); // Context data for notifications
      table.timestamps(true, true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('notification_schedules')
    .dropTableIfExists('group_formation_history')
    .dropTableIfExists('student_schedule_preferences')
    .dropTableIfExists('schedule_slots')
    .dropTableIfExists('group_waiting_list')
    .alterTable('student_registrations', (table) => {
      table.dropColumn('discount_valid_until');
      table.dropColumn('offered_discount');
      table.dropColumn('self_formed_group_members');
      table.dropColumn('learning_option');
      table.dropColumn('group_preference_id');
      table.dropColumn('test_evidence_files');
      table.dropColumn('test_type');
    })
    .alterTable('course_groups', (table) => {
      table.dropColumn('formation_deadline');
      table.dropColumn('formation_type');
      table.dropColumn('group_leader_id');
      table.dropColumn('auto_formed');
      table.dropColumn('schedule_requirements');
      table.dropColumn('required_age_group');
      table.dropColumn('required_cefr_level');
      table.dropColumn('min_students');
      table.dropColumn('target_students');
    })
    .alterTable('students', (table) => {
      table.dropColumn('days_waiting');
      table.dropColumn('last_status_update');
      table.dropColumn('payment_status');
      table.dropColumn('deposit_amount');
      table.dropColumn('registration_status');
      table.dropColumn('unavailable_times');
      table.dropColumn('availability_schedule');
      table.dropColumn('writing_score');
      table.dropColumn('reading_score');
      table.dropColumn('age_group');
    });
};