/**
 * Migration: Add appointment/service and audit fields to schedule_sessions
 */

exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('schedule_sessions');
  if (!hasTable) return;

  const addCol = async (name, builder) => {
    const exists = await knex.schema.hasColumn('schedule_sessions', name);
    if (!exists) {
      await knex.schema.alterTable('schedule_sessions', (table) => {
        builder(table);
      });
    }
  };

  await addCol('appointment_notes', (t) => t.text('appointment_notes').nullable());
  await addCol('created_by', (t) => t.integer('created_by').unsigned().nullable());

  // service fields
  const hasServiceType = await knex.schema.hasColumn('schedule_sessions', 'service_type');
  if (!hasServiceType) {
    // Use enum for MySQL
    await knex.schema.alterTable('schedule_sessions', (t) => {
      t.enu('service_type', ['course', 'custom'], { useNative: true, enumName: 'service_type_enum' })
        .notNullable()
        .defaultTo('course');
    });
  }

  await addCol('service_course_id', (t) => t.integer('service_course_id').unsigned().nullable());
  await addCol('service_custom_text', (t) => t.text('service_custom_text').nullable());

  // Foreign keys (best-effort)
  try {
    await knex.schema.alterTable('schedule_sessions', (t) => {
      t.foreign('created_by').references('users.id').onDelete('SET NULL');
      t.foreign('service_course_id').references('courses.id').onDelete('SET NULL');
    });
  } catch (_) {}
};

exports.down = async function(knex) {
  const hasTable = await knex.schema.hasTable('schedule_sessions');
  if (!hasTable) return;
  try {
    await knex.schema.alterTable('schedule_sessions', (t) => {
      try { t.dropForeign('created_by'); } catch (_) {}
      try { t.dropForeign('service_course_id'); } catch (_) {}
    });
  } catch (_) {}

  const dropCol = async (name) => {
    const exists = await knex.schema.hasColumn('schedule_sessions', name);
    if (exists) {
      await knex.schema.alterTable('schedule_sessions', (t) => t.dropColumn(name));
    }
  };

  await dropCol('appointment_notes');
  await dropCol('created_by');
  await dropCol('service_custom_text');
  await dropCol('service_course_id');

  // Drop enum column last
  const hasServiceType = await knex.schema.hasColumn('schedule_sessions', 'service_type');
  if (hasServiceType) {
    await knex.schema.alterTable('schedule_sessions', (t) => {
      t.dropColumn('service_type');
    });
    // Optionally drop enum type if DB supports (MySQL drops automatically)
  }
};
