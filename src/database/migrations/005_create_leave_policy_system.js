/**
 * Phase 3: Leave Policy Management System
 * This migration creates tables for dynamic leave policy management,
 * change tracking, and notification system.
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Leave Policy Rules - Dynamic configuration instead of hardcoded values
    .createTable('leave_policy_rules', (table) => {
      table.increments('id').primary();
      table.integer('branch_id').unsigned().notNullable().references('id').inTable('branches');
      table.string('rule_name', 200).notNullable(); // e.g., "ระเบียบการลาคอร์ส 60 ชม."
      table.enum('course_type', [
        'private', 'pair', 'group_small', 'group_large',
        'conversation_kids', 'conversation_adults', 'english_4skills',
        'ielts_prep', 'toeic_prep', 'toefl_prep',
        'chinese_conversation', 'chinese_4skills'
      ]).notNullable();
      table.integer('course_hours').unsigned().notNullable(); // 40, 50, 60 hours
      table.integer('max_students').unsigned().defaultTo(1); // 1 for private, 2 for pair, etc.
      table.integer('leave_credits').unsigned().notNullable(); // Number of leaves allowed
      table.decimal('price_per_hour', 10, 2); // Optional: price override
      table.text('conditions'); // JSON: Special conditions/rules
      table.date('effective_date').notNullable(); // When this rule takes effect
      table.date('expiry_date'); // When this rule expires (null = no expiry)
      table.enum('status', ['draft', 'active', 'inactive', 'archived']).defaultTo('draft');
      table.integer('created_by').unsigned().notNullable().references('id').inTable('users');
      table.timestamps(true, true);
      
      // Ensure unique rules per branch/course combination
      table.unique(['branch_id', 'course_type', 'course_hours', 'effective_date']);
    })
    
    // Edit Permissions - Who can modify leave policies
    .createTable('leave_policy_permissions', (table) => {
      table.increments('id').primary();
      table.integer('policy_rule_id').unsigned().notNullable().references('id').inTable('leave_policy_rules').onDelete('CASCADE');
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.enum('permission_type', ['edit', 'approve', 'view']).notNullable();
      table.integer('granted_by').unsigned().notNullable().references('id').inTable('users');
      table.timestamps(true, true);
      
      table.unique(['policy_rule_id', 'user_id', 'permission_type']);
    })
    
    // Change History/Audit Trail - Track all modifications
    .createTable('leave_policy_changes', (table) => {
      table.increments('id').primary();
      table.integer('policy_rule_id').unsigned().notNullable().references('id').inTable('leave_policy_rules');
      table.enum('change_type', ['create', 'update', 'delete', 'revert']).notNullable();
      table.integer('changed_by').unsigned().notNullable().references('id').inTable('users');
      table.text('change_reason').notNullable(); // Required reason for every change
      table.json('old_values'); // Previous values before change
      table.json('new_values'); // New values after change
      table.text('field_changes'); // Human-readable summary of what changed
      table.integer('reverted_from_change_id').unsigned().references('id').inTable('leave_policy_changes'); // If this is a revert
      table.enum('status', ['pending_approval', 'approved', 'rejected', 'applied']).defaultTo('applied');
      table.integer('approved_by').unsigned().references('id').inTable('users');
      table.timestamp('approved_at');
      table.timestamp('applied_at');
      table.timestamps(true, true);
    })
    
    // Notifications for policy changes
    .createTable('leave_policy_notifications', (table) => {
      table.increments('id').primary();
      table.integer('change_id').unsigned().notNullable().references('id').inTable('leave_policy_changes').onDelete('CASCADE');
      table.integer('recipient_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('notification_type', 50).notNullable(); // 'policy_changed', 'approval_required', etc.
      table.string('title', 200).notNullable();
      table.text('message').notNullable();
      table.json('metadata'); // Additional data like links, old/new values
      table.boolean('is_read').defaultTo(false);
      table.timestamp('read_at');
      table.timestamps(true, true);
    })
    
    // Room Usage Notifications
    .createTable('room_notifications', (table) => {
      table.increments('id').primary();
      table.integer('branch_id').unsigned().notNullable().references('id').inTable('branches');
      table.integer('room_id').unsigned().references('id').inTable('rooms');
      table.integer('teacher_id').unsigned().references('id').inTable('teachers');
      table.enum('notification_type', ['room_available', 'room_conflict', 'room_change', 'general']).notNullable();
      table.string('title', 200).notNullable();
      table.text('message').notNullable();
      table.datetime('schedule_time'); // When the room usage is scheduled
      table.json('metadata'); // Room details, alternative rooms, etc.
      table.boolean('is_popup_shown').defaultTo(false);
      table.boolean('is_read').defaultTo(false);
      table.timestamp('read_at');
      table.timestamps(true, true);
    })
    
    // Update enrollments table to reference leave policy rules
    .alterTable('enrollments', (table) => {
      table.integer('leave_policy_rule_id').unsigned().references('id').inTable('leave_policy_rules');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .alterTable('enrollments', (table) => {
      table.dropColumn('leave_policy_rule_id');
    })
    .dropTableIfExists('room_notifications')
    .dropTableIfExists('leave_policy_notifications')
    .dropTableIfExists('leave_policy_changes')
    .dropTableIfExists('leave_policy_permissions')
    .dropTableIfExists('leave_policy_rules');
};