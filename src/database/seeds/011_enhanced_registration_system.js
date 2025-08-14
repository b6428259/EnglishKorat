/**
 * Seed file for enhanced student registration system
 * Adds schedule slots, notification templates, and sample data for the registration flow
 */

exports.seed = async function(knex) {
  // Clear existing entries
  await knex('notification_schedules').del();
  await knex('student_schedule_preferences').del();
  await knex('schedule_slots').del();
  await knex('group_waiting_list').del();

  console.log('🧹 Cleared enhanced registration system tables');

  // Insert schedule slots
  const scheduleSlots = [];
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const timeSlots = [
    { start: '09:00:00', end: '11:00:00' },
    { start: '11:00:00', end: '13:00:00' },
    { start: '13:00:00', end: '15:00:00' },
    { start: '15:00:00', end: '17:00:00' },
    { start: '17:00:00', end: '19:00:00' },
    { start: '19:00:00', end: '21:00:00' }
  ];

  let slotId = 1;
  for (const day of days) {
    for (const slot of timeSlots) {
      const slotCode = `${day.substring(0, 3).toUpperCase()}_${slot.start.substring(0, 2)}_${slot.end.substring(0, 2)}`;
      scheduleSlots.push({
        id: slotId++,
        day_of_week: day,
        start_time: slot.start,
        end_time: slot.end,
        slot_code: slotCode,
        popular_slot: ['17:00:00', '19:00:00'].includes(slot.start), // Evening slots are popular
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }

  await knex('schedule_slots').insert(scheduleSlots);
  console.log(`✅ Inserted ${scheduleSlots.length} schedule slots`);

  // Update existing students with enhanced registration fields
  const students = await knex('students').select('*');
  
  for (const student of students) {
    // Determine age group if not set
    let age_group = student.age_group;
    if (!age_group) {
      if (student.grade_level && parseInt(student.grade_level) <= 6) {
        age_group = 'kids';
      } else if (student.age && student.age >= 17) {
        age_group = 'adults';
      } else {
        age_group = 'students';
      }
    }

    // Generate sample availability schedule
    const availability_schedule = {
      monday: [{ start_time: '17:00:00', end_time: '19:00:00' }],
      wednesday: [{ start_time: '17:00:00', end_time: '19:00:00' }],
      friday: [{ start_time: '19:00:00', end_time: '21:00:00' }]
    };

    await knex('students').where('id', student.id).update({
      age_group,
      availability_schedule: JSON.stringify(availability_schedule),
      unavailable_times: JSON.stringify([]),
      registration_status: 'finding_group',
      deposit_amount: 3000,
      payment_status: 'partial',
      last_status_update: new Date(),
      days_waiting: Math.floor(Math.random() * 45), // Random waiting days 0-45
      reading_score: student.listening_score ? student.listening_score + Math.floor(Math.random() * 10) - 5 : null,
      writing_score: student.grammar_score ? student.grammar_score + Math.floor(Math.random() * 10) - 5 : null,
      updated_at: new Date()
    });

    // Add some students to waiting list (not all)
    if (Math.random() > 0.5 && student.cefr_level) {
      await knex('group_waiting_list').insert({
        student_id: student.id,
        required_cefr_level: student.cefr_level,
        required_age_group: age_group,
        available_schedule: JSON.stringify(availability_schedule),
        waiting_since: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
        days_waiting: Math.floor(Math.random() * 30),
        active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }

  console.log(`✅ Updated ${students.length} students with enhanced registration data`);

  // Update course groups with enhanced grouping fields
  const courseGroups = await knex('course_groups').select('*');
  
  for (const group of courseGroups) {
    const groupStudents = await knex('student_groups')
      .join('students', 'student_groups.student_id', 'students.id')
      .where('student_groups.group_id', group.id)
      .where('student_groups.status', 'active')
      .select('students.*');

    if (groupStudents.length > 0) {
      const firstStudent = groupStudents[0];
      
      await knex('course_groups').where('id', group.id).update({
        required_cefr_level: firstStudent.cefr_level,
        required_age_group: firstStudent.age_group,
        target_students: Math.max(4, groupStudents.length),
        min_students: 2,
        auto_formed: Math.random() > 0.5,
        formation_type: ['individual', 'self_formed', 'institute_arranged'][Math.floor(Math.random() * 3)],
        schedule_requirements: JSON.stringify({
          days_per_week: 2,
          preferred_times: ['17:00-19:00', '19:00-21:00']
        }),
        updated_at: new Date()
      });
    }
  }

  console.log(`✅ Updated ${courseGroups.length} course groups with enhanced grouping data`);

  // Create notification schedules for active students
  const activeUsers = await knex('users')
    .join('students', 'users.id', 'students.user_id')
    .where('users.status', 'active')
    .where('students.registration_status', 'in', ['finding_group', 'has_group_members'])
    .select('users.id as user_id')
    .limit(10); // Limit for testing

  for (const user of activeUsers) {
    await knex('notification_schedules').insert({
      user_id: user.user_id,
      notification_type: 'daily_group_update',
      frequency: 'every_3_days',
      preferred_time: '09:00:00',
      next_send_at: new Date(Date.now() + Math.random() * 3 * 24 * 60 * 60 * 1000), // Random within next 3 days
      active: true,
      notification_data: JSON.stringify({}),
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  console.log(`✅ Created notification schedules for ${activeUsers.length} users`);

  // Update student registrations with enhanced fields
  const registrations = await knex('student_registrations').select('*');
  
  for (const registration of registrations) {
    const student = await knex('students').where('user_id', registration.user_id).first();
    
    if (student) {
      await knex('student_registrations').where('id', registration.id).update({
        test_type: student.age_group === 'kids' ? 'paper_based' : 'online_cefr',
        learning_option: ['individual', 'self_formed_group', 'institute_arranged'][Math.floor(Math.random() * 3)],
        test_evidence_files: JSON.stringify([]),
        offered_discount: Math.random() > 0.7 ? (Math.random() > 0.5 ? 3000 : 5000) : 0,
        updated_at: new Date()
      });
    }
  }

  console.log(`✅ Updated ${registrations.length} student registrations with enhanced data`);

  console.log('🎉 Enhanced student registration system seeding completed!');
  console.log('📊 Summary:');
  console.log(`   - ${scheduleSlots.length} schedule slots created`);
  console.log(`   - ${students.length} students updated with registration data`);
  console.log(`   - ${courseGroups.length} course groups enhanced`);
  console.log(`   - ${activeUsers.length} notification schedules created`);
  console.log(`   - ${registrations.length} student registrations updated`);
};