/**
 * Phase 4.1: Update existing tables to support new features
 * This migration adds missing columns to existing tables
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Add course category reference to courses
    .alterTable('courses', (table) => {
      table.integer('category_id').unsigned().references('id').inTable('course_categories');
    })
    
    // Add avatar and additional profile fields to users
    .alterTable('users', (table) => {
      table.string('avatar', 500); // Profile picture path
    })
    
    // Add QR code support to classes
    .alterTable('classes', (table) => {
      table.string('qr_code', 100); // QR code for attendance
      table.datetime('qr_generated_at');
    })
    
    // Add promotion tracking to enrollments
    .alterTable('enrollments', (table) => {
      table.integer('promotion_id').unsigned(); // Track which promotion was used
      table.text('referral_source'); // How student found the school
    })
    
    // Add file upload support to teaching reports
    .alterTable('teaching_reports', (table) => {
      table.text('attachment_files'); // JSON array of uploaded files
    })
    
    // Add payment slip verification support to payments
    .alterTable('payments', (table) => {
      table.string('thunder_verification_id', 100); // thunder.in.th API verification ID
      table.json('thunder_response'); // Full API response
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .alterTable('payments', (table) => {
      table.dropColumn('thunder_response');
      table.dropColumn('thunder_verification_id');
    })
    .alterTable('teaching_reports', (table) => {
      table.dropColumn('attachment_files');
    })
    .alterTable('enrollments', (table) => {
      table.dropColumn('referral_source');
      table.dropColumn('promotion_id');
    })
    .alterTable('classes', (table) => {
      table.dropColumn('qr_generated_at');
      table.dropColumn('qr_code');
    })
    .alterTable('users', (table) => {
      table.dropColumn('avatar');
    })
    .alterTable('courses', (table) => {
      table.dropColumn('category_id');
    });
};