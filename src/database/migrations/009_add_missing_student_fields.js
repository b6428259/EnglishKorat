/**
 * Migration to add missing student registration fields
 * This migration adds all the fields needed for the comprehensive student registration form
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Add missing fields to students table
    .alterTable('students', (table) => {
      // Personal Information
      table.string('first_name_en', 100).after('first_name'); // English first name
      table.string('last_name_en', 100).after('last_name'); // English last name
      table.date('date_of_birth').after('nickname'); // Date of birth
      table.enum('gender', ['male', 'female', 'other']).after('date_of_birth'); // Gender
      table.text('address').after('gender'); // Address
      table.string('citizen_id', 13).unique().after('address'); // Encrypted citizen ID
      
      // Academic Information  
      table.string('current_education', 50).after('grade_level'); // Current education level
      table.string('preferred_language', 20).after('cefr_level'); // english, chinese
      table.string('language_level', 30).after('preferred_language'); // beginner, elementary, etc.
      table.string('recent_cefr', 10).after('language_level'); // Recent CEFR/HSK level
      table.string('learning_style', 20).after('recent_cefr'); // private, pair, group
      table.text('learning_goals').after('learning_style'); // Learning reasons and goals
      
      // Contact & Emergency Information
      table.string('parent_name', 100).after('learning_goals'); // Parent name
      table.string('parent_phone', 20).after('parent_name'); // Parent phone
      table.string('emergency_contact', 100).after('parent_phone'); // Emergency contact name
      table.string('emergency_phone', 20).after('emergency_contact'); // Emergency contact phone
      
      // Schedule Information (JSON fields)
      table.json('preferred_time_slots').after('emergency_phone'); // Preferred learning times
      table.json('unavailable_time_slots').after('preferred_time_slots'); // Unavailable times
      table.json('selected_courses').after('unavailable_time_slots'); // Selected courses array
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .alterTable('students', (table) => {
      table.dropColumn('selected_courses');
      table.dropColumn('unavailable_time_slots');
      table.dropColumn('preferred_time_slots');
      table.dropColumn('emergency_phone');
      table.dropColumn('emergency_contact');
      table.dropColumn('parent_phone');
      table.dropColumn('parent_name');
      table.dropColumn('learning_goals');
      table.dropColumn('learning_style');
      table.dropColumn('recent_cefr');
      table.dropColumn('language_level');
      table.dropColumn('preferred_language');
      table.dropColumn('current_education');
      table.dropColumn('citizen_id');
      table.dropColumn('address');
      table.dropColumn('gender');
      table.dropColumn('date_of_birth');
      table.dropColumn('last_name_en');
      table.dropColumn('first_name_en');
    });
};
