/**
 * Phase 4: Comprehensive School Management System
 * This migration adds missing tables for complete school management functionality
 * including permissions, course categories, student registration process,
 * QR code system, document management, and e-book system.
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // User Permissions System
    .createTable('permissions', (table) => {
      table.increments('id').primary();
      table.string('name', 100).notNullable().unique();
      table.string('description', 255);
      table.string('module', 50).notNullable(); // 'users', 'courses', 'classes', 'reports', etc.
      table.timestamps(true, true);
    })
    .createTable('user_permissions', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.integer('permission_id').unsigned().notNullable().references('id').inTable('permissions').onDelete('CASCADE');
      table.integer('granted_by').unsigned().notNullable().references('id').inTable('users');
      table.timestamps(true, true);
      table.unique(['user_id', 'permission_id']);
    })
    
    // Course Categories and Enhanced Course Management
    .createTable('course_categories', (table) => {
      table.increments('id').primary();
      table.string('name', 100).notNullable();
      table.string('name_en', 100).notNullable();
      table.text('description');
      table.text('description_en');
      table.enum('type', ['conversation', 'skills', 'test_prep', 'language']).notNullable();
      table.integer('sort_order').defaultTo(0);
      table.boolean('active').defaultTo(true);
      table.timestamps(true, true);
    })
    
    // Student Registration Process (before enrollment)
    .createTable('student_registrations', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.integer('course_id').unsigned().references('id').inTable('courses');
      table.integer('grammar_score').unsigned();
      table.integer('speaking_score').unsigned();
      table.integer('listening_score').unsigned();
      table.string('cefr_level', 10); // A1, A2, B1, B2, C1, C2
      table.text('learning_goals');
      table.string('referral_source', 100);
      table.integer('promotion_id').unsigned(); // For tracking promotions used
      table.integer('admin_id').unsigned().references('id').inTable('users');
      table.enum('status', ['pending', 'approved', 'rejected', 'enrolled']).defaultTo('pending');
      table.datetime('test_date');
      table.datetime('approved_at');
      table.text('admin_notes');
      table.timestamps(true, true);
    })
    
    // Test Results (detailed test scores)
    .createTable('test_results', (table) => {
      table.increments('id').primary();
      table.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
      table.integer('registration_id').unsigned().references('id').inTable('student_registrations');
      table.integer('grammar_score').unsigned();
      table.integer('speaking_score').unsigned();
      table.integer('listening_score').unsigned();
      table.integer('reading_score').unsigned();
      table.integer('writing_score').unsigned();
      table.string('cefr_level', 10);
      table.datetime('test_date').notNullable();
      table.integer('conducted_by').unsigned().references('id').inTable('users');
      table.text('notes');
      table.text('recommendations');
      table.timestamps(true, true);
    })
    
    // Student Groups (linking students to course groups with specific credits)
    .createTable('student_groups', (table) => {
      table.increments('id').primary();
      table.integer('group_id').unsigned().notNullable().references('id').inTable('course_groups').onDelete('CASCADE');
      table.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
      table.date('enrollment_date').notNullable();
      table.enum('status', ['active', 'completed', 'withdrawn', 'transferred']).defaultTo('active');
      table.integer('leave_credits_used').defaultTo(0);
      table.integer('leave_credits_total').defaultTo(0);
      table.timestamps(true, true);
      table.unique(['group_id', 'student_id']);
    })
    
    // Enhanced Class Sessions (more detailed than basic classes)
    .createTable('class_sessions', (table) => {
      table.increments('id').primary();
      table.integer('class_id').unsigned().notNullable().references('id').inTable('classes').onDelete('CASCADE');
      table.datetime('actual_start');
      table.datetime('actual_end');
      table.enum('session_status', ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled']).defaultTo('scheduled');
      table.string('qr_code', 100).unique(); // QR code for check-in
      table.boolean('attendance_confirmed').defaultTo(false);
      table.datetime('qr_generated_at');
      table.integer('qr_generated_by').unsigned().references('id').inTable('users');
      table.timestamps(true, true);
    })
    
    // Enhanced Student Attendance (replaces basic class_attendances)
    .createTable('student_attendance', (table) => {
      table.increments('id').primary();
      table.integer('session_id').unsigned().notNullable().references('id').inTable('class_sessions').onDelete('CASCADE');
      table.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
      table.enum('status', ['present', 'absent', 'excused', 'late']).defaultTo('present');
      table.datetime('check_in_time');
      table.boolean('qr_check_in').defaultTo(false);
      table.string('absence_reason', 255);
      table.text('notes');
      table.timestamps(true, true);
      table.unique(['session_id', 'student_id']);
    })
    
    // Make-up Sessions for Leave Management
    .createTable('make_up_sessions', (table) => {
      table.increments('id').primary();
      table.integer('original_session_id').unsigned().notNullable().references('id').inTable('class_sessions');
      table.integer('new_session_id').unsigned().references('id').inTable('class_sessions');
      table.integer('student_id').unsigned().notNullable().references('id').inTable('students');
      table.enum('status', ['scheduled', 'completed', 'cancelled']).defaultTo('scheduled');
      table.datetime('scheduled_date');
      table.integer('arranged_by').unsigned().references('id').inTable('users');
      table.text('notes');
      table.timestamps(true, true);
    })
    
    // Comprehensive Notification System
    .createTable('notifications', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.enum('type', [
        'class_confirmation', 'leave_approval', 'class_cancellation', 
        'schedule_change', 'payment_reminder', 'report_deadline',
        'room_conflict', 'general'
      ]).notNullable();
      table.string('title', 200).notNullable();
      table.text('message').notNullable();
      table.json('metadata'); // Additional data like links, IDs, etc.
      table.boolean('line_sent').defaultTo(false);
      table.boolean('web_read').defaultTo(false);
      table.datetime('line_sent_at');
      table.datetime('web_read_at');
      table.datetime('scheduled_for'); // For delayed notifications
      table.timestamps(true, true);
    })
    
    // LINE Integration
    .createTable('line_groups', (table) => {
      table.increments('id').primary();
      table.integer('group_id').unsigned().references('id').inTable('course_groups');
      table.integer('branch_id').unsigned().notNullable().references('id').inTable('branches');
      table.string('line_group_id', 100).notNullable();
      table.string('webhook_url', 500);
      table.boolean('active').defaultTo(true);
      table.timestamps(true, true);
    })
    
    // Notification Templates
    .createTable('notification_templates', (table) => {
      table.increments('id').primary();
      table.enum('type', [
        'class_confirmation', 'leave_approval', 'class_cancellation',
        'schedule_change', 'payment_reminder', 'report_deadline'
      ]).notNullable().unique();
      table.string('title_th', 200).notNullable();
      table.string('title_en', 200).notNullable();
      table.text('message_th').notNullable();
      table.text('message_en').notNullable();
      table.json('variables'); // Available template variables
      table.boolean('active').defaultTo(true);
      table.timestamps(true, true);
    })

    
    // Enhanced Teacher Salary System
    .createTable('teacher_salaries', (table) => {
      table.increments('id').primary();
      table.integer('teacher_id').unsigned().notNullable().references('id').inTable('teachers').onDelete('CASCADE');
      table.integer('month').unsigned().notNullable(); // 1-12
      table.integer('year').unsigned().notNullable();
      table.decimal('base_rate', 8, 2).notNullable();
      table.decimal('hours_taught', 8, 2).notNullable();
      table.decimal('bonus_amount', 8, 2).defaultTo(0);
      table.decimal('deduction_amount', 8, 2).defaultTo(0);
      table.decimal('total_amount', 10, 2).notNullable();
      table.boolean('report_submitted').defaultTo(false);
      table.enum('status', ['draft', 'approved', 'paid']).defaultTo('draft');
      table.datetime('approved_at');
      table.integer('approved_by').unsigned().references('id').inTable('users');
      table.text('notes');
      table.timestamps(true, true);
      table.unique(['teacher_id', 'month', 'year']);
    })
    
    // Student Progress Tracking
    .createTable('student_progress', (table) => {
      table.increments('id').primary();
      table.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
      table.integer('session_id').unsigned().notNullable().references('id').inTable('class_sessions');
      table.text('performance_notes');
      table.json('skill_improvement'); // JSON with skill scores/improvements
      table.decimal('attendance_rate', 5, 2); // Percentage
      table.string('current_cefr_level', 10);
      table.integer('evaluated_by').unsigned().references('id').inTable('teachers');
      table.timestamps(true, true);
    })
    
    // E-book and Stock Management System
    .createTable('ebooks', (table) => {
      table.increments('id').primary();
      table.string('title', 255).notNullable();
      table.string('author', 255);
      table.string('isbn', 50);
      table.enum('category', [
        'conversation', 'grammar', 'vocabulary', 'test_prep',
        'children', 'business', 'academic', 'general'
      ]).notNullable();
      table.string('level', 20); // A1, A2, B1, etc.
      table.integer('stock_quantity').unsigned().defaultTo(0);
      table.integer('borrowed_count').unsigned().defaultTo(0);
      table.decimal('price', 8, 2);
      table.string('file_path', 500); // Path to ebook file
      table.string('cover_image', 500); // Cover image path
      table.text('description');
      table.boolean('available').defaultTo(true);
      table.timestamps(true, true);
    })
    
    .createTable('book_borrowings', (table) => {
      table.increments('id').primary();
      table.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
      table.integer('ebook_id').unsigned().notNullable().references('id').inTable('ebooks').onDelete('CASCADE');
      table.date('borrow_date').notNullable();
      table.date('due_date').notNullable();
      table.date('return_date');
      table.enum('status', ['borrowed', 'returned', 'overdue', 'lost']).defaultTo('borrowed');
      table.decimal('late_fee', 8, 2).defaultTo(0);
      table.integer('issued_by').unsigned().references('id').inTable('users');
      table.integer('returned_to').unsigned().references('id').inTable('users');
      table.text('notes');
      table.timestamps(true, true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('book_borrowings')
    .dropTableIfExists('ebooks')
    .dropTableIfExists('student_progress')
    .dropTableIfExists('teacher_salaries')
    .dropTableIfExists('notification_templates')
    .dropTableIfExists('line_groups')
    .dropTableIfExists('notifications')
    .dropTableIfExists('make_up_sessions')
    .dropTableIfExists('student_attendance')
    .dropTableIfExists('class_sessions')
    .dropTableIfExists('student_groups')
    .dropTableIfExists('test_results')
    .dropTableIfExists('student_registrations')
    .dropTableIfExists('course_categories')
    .dropTableIfExists('user_permissions')
    .dropTableIfExists('permissions');
};