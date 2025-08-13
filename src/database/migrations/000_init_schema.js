/**
 * Initial migration placeholder for Knex. No schema changes here.
 * This file exists to satisfy Knex's migration history.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  // No schema changes
  return Promise.resolve();
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // No schema changes to revert
  return Promise.resolve();
};
