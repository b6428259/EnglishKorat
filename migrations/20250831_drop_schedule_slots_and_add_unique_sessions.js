/**
 * Migration: Drop obsolete schedule_slots table and add unique constraint to prevent duplicate sessions
 */

exports.up = async function(knex) {
  // 1) Drop foreign keys and referencing columns to schedule_slots, then drop the table (if exists)
  const hasScheduleSlots = await knex.schema.hasTable('schedule_slots');
  if (hasScheduleSlots) {
    // Find FKs referencing schedule_slots
    const [fkRows] = await knex.raw(`
      SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND REFERENCED_TABLE_NAME = 'schedule_slots'
    `);

    for (const row of fkRows) {
      const tbl = row.TABLE_NAME;
      const constraint = row.CONSTRAINT_NAME;
      const col = row.COLUMN_NAME;
      try {
        await knex.raw(`ALTER TABLE \`${tbl}\` DROP FOREIGN KEY \`${constraint}\``);
      } catch (e) {
        // ignore if already dropped
      }
      try {
        await knex.raw(`ALTER TABLE \`${tbl}\` DROP COLUMN \`${col}\``);
      } catch (e) {
        // ignore if can't drop column
      }
    }

    // Finally drop schedule_slots
    await knex.schema.dropTableIfExists('schedule_slots');
  }

  // 2) Add unique index to schedule_sessions on (schedule_id, session_date, start_time, end_time)
  const hasScheduleSessions = await knex.schema.hasTable('schedule_sessions');
  if (hasScheduleSessions) {
    const indexName = 'uniq_schedule_sessions_schedule_date_time';
    try {
      await knex.raw(`CREATE UNIQUE INDEX ${indexName} ON schedule_sessions (schedule_id, session_date, start_time, end_time)`);
    } catch (e) {
      // ignore (already exists or duplicates present)
    }
  }
};

exports.down = async function(knex) {
  // 1) Remove unique index
  const hasScheduleSessions = await knex.schema.hasTable('schedule_sessions');
  if (hasScheduleSessions) {
    const indexName = 'uniq_schedule_sessions_schedule_date_time';
    try {
      await knex.raw(`DROP INDEX ${indexName} ON schedule_sessions`);
    } catch (e) {
      // ignore
    }
  }

  // 2) Cannot safely recreate schedule_slots without full schema; leaving as no-op
};
