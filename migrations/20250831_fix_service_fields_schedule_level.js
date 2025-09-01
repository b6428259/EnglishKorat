/**
 * Migration: Move service fields to schedules and drop incorrect session-level service columns.
 */

exports.up = async function(knex) {
  // 1) schedule_sessions: drop appointment/service fields if they exist (keep created_by)
  const dropIfExists = async (col) => {
    const exists = await knex.schema.hasColumn('schedule_sessions', col);
    if (exists) {
      await knex.schema.alterTable('schedule_sessions', (t) => {
        t.dropColumn(col);
      });
    }
  };

  // Drop FK first for service_course_id if present
  const hasServiceCourseId = await knex.schema.hasColumn('schedule_sessions', 'service_course_id');
  if (hasServiceCourseId) {
    try {
      await knex.schema.alterTable('schedule_sessions', (t) => {
        // Try explicit name first
        t.dropForeign('service_course_id', 'schedule_sessions_service_course_id_foreign');
      });
    } catch (_) {
      try {
        await knex.schema.alterTable('schedule_sessions', (t) => {
          t.dropForeign('service_course_id');
        });
      } catch (_) {}
    }
  }

  await dropIfExists('appointment_notes');
  await dropIfExists('service_type');
  await dropIfExists('service_course_id');
  await dropIfExists('service_custom_text');

  // 2) schedules: add service_type and service_custom_text if not present
  const addScheduleCol = async (name, builder) => {
    const exists = await knex.schema.hasColumn('schedules', name);
    if (!exists) {
      await knex.schema.alterTable('schedules', (t) => builder(t));
    }
  };

  const hasEnum = await knex.schema.hasColumn('schedules', 'service_type');
  if (!hasEnum) {
    await knex.schema.alterTable('schedules', (t) => {
      t.enu('service_type', ['course', 'custom'], { useNative: true, enumName: 'schedule_service_type_enum' })
        .notNullable()
        .defaultTo('course');
    });
  }
  await addScheduleCol('service_custom_text', (t) => t.text('service_custom_text').nullable());
};

exports.down = async function(knex) {
  // Recreate session-level service columns (not recommended but for rollback)
  const addSessionCol = async (name, builder) => {
    const exists = await knex.schema.hasColumn('schedule_sessions', name);
    if (!exists) {
      await knex.schema.alterTable('schedule_sessions', (t) => builder(t));
    }
  };

  await addSessionCol('appointment_notes', (t) => t.text('appointment_notes').nullable());
  const hasServiceType = await knex.schema.hasColumn('schedule_sessions', 'service_type');
  if (!hasServiceType) {
    await knex.schema.alterTable('schedule_sessions', (t) => {
      t.enu('service_type', ['course', 'custom'], { useNative: true, enumName: 'service_type_enum' })
        .notNullable()
        .defaultTo('course');
    });
  }
  await addSessionCol('service_course_id', (t) => t.integer('service_course_id').unsigned().nullable());
  await addSessionCol('service_custom_text', (t) => t.text('service_custom_text').nullable());

  try {
    await knex.schema.alterTable('schedule_sessions', (t) => {
      t.foreign('service_course_id').references('courses.id').onDelete('SET NULL');
    });
  } catch (_) {}

  // Drop schedule-level fields on rollback
  const dropScheduleCol = async (name) => {
    const exists = await knex.schema.hasColumn('schedules', name);
    if (exists) {
      await knex.schema.alterTable('schedules', (t) => t.dropColumn(name));
    }
  };

  const hasScheduleServiceType = await knex.schema.hasColumn('schedules', 'service_type');
  if (hasScheduleServiceType) {
    await knex.schema.alterTable('schedules', (t) => t.dropColumn('service_type'));
  }
  await dropScheduleCol('service_custom_text');
};
