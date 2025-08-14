/**
 * Comprehensive Pricing System Migration
 * Creates tables to support the detailed pricing structure for:
 * - Conversation courses (Thai & Native teacher)
 * - IELTS/TOEFL promotion courses
 * - Individual, Pair, and Group pricing tiers
 * - Multiple duration options (40, 50, 60 hours)
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Course duration and pricing structure
    .createTable('course_durations', (table) => {
      table.increments('id').primary();
      table.integer('hours').notNullable().unique(); // 40, 50, 60
      table.string('name', 50).notNullable(); // "40 Hours", "50 Hours", "60 Hours Premium"
      table.boolean('is_premium').defaultTo(false); // For 60-hour premium courses
      table.text('description');
      table.boolean('active').defaultTo(true);
      table.timestamps(true, true);
    })
    
    // Group size pricing tiers
    .createTable('pricing_tiers', (table) => {
      table.increments('id').primary();
      table.string('tier_type', 50).notNullable(); // 'individual', 'pair', 'group'
      table.string('display_name', 100).notNullable(); // 'Individual', 'Pair', 'Group (3-4 people)'
      table.integer('min_students').notNullable(); // 1, 2, 3
      table.integer('max_students').notNullable(); // 1, 2, 4
      table.integer('sort_order').defaultTo(0);
      table.boolean('active').defaultTo(true);
      table.timestamps(true, true);
    })
    
    // Update existing course_categories table for pricing structure
    .alterTable('course_categories', (table) => {
      table.string('code', 50); // Add code field if not exists
      table.boolean('includes_book_fee').defaultTo(true); // Whether book fee applies
      table.decimal('default_book_fee', 8, 2).defaultTo(900.00); // Standard book fee
    })
    
    // Comprehensive pricing matrix
    .createTable('course_pricing', (table) => {
      table.increments('id').primary();
      table.integer('category_id').unsigned().notNullable().references('id').inTable('course_categories');
      table.integer('duration_id').unsigned().notNullable().references('id').inTable('course_durations');
      table.integer('pricing_tier_id').unsigned().notNullable().references('id').inTable('pricing_tiers');
      table.decimal('base_price', 10, 2).notNullable(); // Price without book fee
      table.decimal('book_fee', 8, 2).defaultTo(0); // Book fee for this specific combination
      table.decimal('total_price', 10, 2).notNullable(); // base_price + book_fee
      table.decimal('price_per_hour_per_person', 8, 2).notNullable(); // For reference
      table.text('notes'); // Special conditions or notes
      table.boolean('active').defaultTo(true);
      table.timestamps(true, true);
      table.unique(['category_id', 'duration_id', 'pricing_tier_id']); // One price per combination
    })
    
    // Enhanced course table updates (only add missing columns)
    .alterTable('courses', (table) => {
      table.integer('duration_id').unsigned().references('id').inTable('course_durations');
      table.boolean('uses_dynamic_pricing').defaultTo(false); // Whether to use new pricing system
      table.decimal('base_price_per_hour', 8, 2); // For backward compatibility
      table.text('pricing_notes');
    })
    
    // Enrollment pricing tracking
    .createTable('enrollment_pricing', (table) => {
      table.increments('id').primary();
      table.integer('enrollment_id').unsigned().notNullable().references('id').inTable('enrollments').onDelete('CASCADE');
      table.integer('course_pricing_id').unsigned().references('id').inTable('course_pricing');
      table.integer('group_size_at_enrollment').unsigned().notNullable(); // Group size when enrolled
      table.decimal('calculated_base_price', 10, 2).notNullable();
      table.decimal('book_fee_applied', 8, 2).defaultTo(0);
      table.decimal('total_price_calculated', 10, 2).notNullable();
      table.boolean('book_fee_waived').defaultTo(false);
      table.text('pricing_calculation_details'); // JSON with calculation breakdown
      table.text('notes');
      table.timestamps(true, true);
    })
    
    // Pricing change history for group size adjustments
    .createTable('pricing_change_history', (table) => {
      table.increments('id').primary();
      table.integer('enrollment_id').unsigned().notNullable().references('id').inTable('enrollments');
      table.integer('course_group_id').unsigned().references('id').inTable('course_groups');
      table.integer('previous_group_size').unsigned();
      table.integer('new_group_size').unsigned().notNullable();
      table.decimal('previous_price', 10, 2);
      table.decimal('new_price', 10, 2).notNullable();
      table.enum('change_reason', ['student_joined', 'student_left', 'group_disbanded', 'manual_adjustment']).notNullable();
      table.text('change_details'); // JSON with detailed information
      table.integer('processed_by').unsigned().references('id').inTable('users');
      table.timestamps(true, true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('pricing_change_history')
    .dropTableIfExists('enrollment_pricing')
    .alterTable('courses', (table) => {
      table.dropColumn('pricing_notes');
      table.dropColumn('base_price_per_hour');
      table.dropColumn('uses_dynamic_pricing');
      table.dropColumn('duration_id');
    })
    .dropTableIfExists('course_pricing')
    .alterTable('course_categories', (table) => {
      table.dropColumn('default_book_fee');
      table.dropColumn('includes_book_fee');
      table.dropColumn('code');
    })
    .dropTableIfExists('pricing_tiers')
    .dropTableIfExists('course_durations');
};