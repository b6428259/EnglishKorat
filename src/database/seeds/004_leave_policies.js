/**
 * Seed data for Phase 3 Leave Policy Management System
 * Creates default leave policy rules matching the requirements
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // First check if we have branches and users
  const branches = await knex('branches').select('*');
  const owners = await knex('users').where('role', 'owner').select('*');
  
  if (branches.length === 0 || owners.length === 0) {
    console.log('Skipping leave policy seeds - need branches and owner users first');
    return;
  }

  // Delete existing leave policy data
  await knex('leave_policy_notifications').del();
  await knex('leave_policy_changes').del();
  await knex('leave_policy_permissions').del();
  await knex('leave_policy_rules').del();

  const branch = branches[0];
  const owner = owners[0];
  const now = new Date();

  // Create leave policy rules based on the Thai requirements
  const leavePolicyRules = [
    // Private Classes (เรียนเดี่ยว)
    {
      id: 1,
      branch_id: branch.id,
      rule_name: 'ระเบียบการลาคอร์สเรียนเดี่ยว 60 ชั่วโมง',
      course_type: 'private',
      course_hours: 60,
      max_students: 1,
      leave_credits: 6, // 6 ครั้ง/ท่าน according to new policy
      effective_date: '2024-01-01',
      status: 'active',
      created_by: owner.id,
      conditions: JSON.stringify({
        advance_notice_hours: 24,
        deadline_time: '18:00',
        makeup_classes_allowed: true,
        notes: 'แจ้งลาล่วงหน้าอย่างน้อย 1 วัน ไม่เกิน 18:00 น.'
      })
    },
    {
      id: 2,
      branch_id: branch.id,
      rule_name: 'ระเบียบการลาคอร์สเรียนเดี่ยว 50 ชั่วโมง',
      course_type: 'private',
      course_hours: 50,
      max_students: 1,
      leave_credits: 4, // 4 ครั้ง/ท่าน
      effective_date: '2024-01-01',
      status: 'active',
      created_by: owner.id,
      conditions: JSON.stringify({
        advance_notice_hours: 24,
        deadline_time: '18:00',
        makeup_classes_allowed: true
      })
    },
    {
      id: 3,
      branch_id: branch.id,
      rule_name: 'ระเบียบการลาคอร์สเรียนเดี่ยว 40 ชั่วโมง',
      course_type: 'private',
      course_hours: 40,
      max_students: 1,
      leave_credits: 3, // 3 ครั้ง/ท่าน
      effective_date: '2024-01-01',
      status: 'active',
      created_by: owner.id,
      conditions: JSON.stringify({
        advance_notice_hours: 24,
        deadline_time: '18:00',
        makeup_classes_allowed: true
      })
    },

    // Pair Classes (เรียนคู่ 1-2 ท่าน)
    {
      id: 4,
      branch_id: branch.id,
      rule_name: 'ระเบียบการลาคอร์สเรียนคู่ 60 ชั่วโมง',
      course_type: 'pair',
      course_hours: 60,
      max_students: 2,
      leave_credits: 2, // 2 ครั้ง/ท่าน
      effective_date: '2024-01-01',
      status: 'active',
      created_by: owner.id,
      conditions: JSON.stringify({
        advance_notice_hours: 24,
        deadline_time: '20:00',
        makeup_classes_allowed: true,
        institute_scheduled_only: true,
        notes: 'ชดเชยตามวันที่สถาบันกำหนด หากมาไม่ได้ถือว่าใช้สิทธิ์แล้ว'
      })
    },
    {
      id: 5,
      branch_id: branch.id,
      rule_name: 'ระเบียบการลาคอร์สเรียนคู่ 50 ชั่วโมง',
      course_type: 'pair',
      course_hours: 50,
      max_students: 2,
      leave_credits: 2, // 2 ครั้ง/ท่าน
      effective_date: '2024-01-01',
      status: 'active',
      created_by: owner.id,
      conditions: JSON.stringify({
        advance_notice_hours: 24,
        deadline_time: '20:00',
        makeup_classes_allowed: true,
        institute_scheduled_only: true
      })
    },
    {
      id: 6,
      branch_id: branch.id,
      rule_name: 'ระเบียบการลาคอร์สเรียนคู่ 40 ชั่วโมง',
      course_type: 'pair',
      course_hours: 40,
      max_students: 2,
      leave_credits: 1, // 1 ครั้ง/ท่าน
      effective_date: '2024-01-01',
      status: 'active',
      created_by: owner.id,
      conditions: JSON.stringify({
        advance_notice_hours: 24,
        deadline_time: '20:00',
        makeup_classes_allowed: true,
        institute_scheduled_only: true
      })
    },

    // Small Group Classes (เรียนกลุ่มเล็ก 3-5 ท่าน)
    {
      id: 7,
      branch_id: branch.id,
      rule_name: 'ระเบียบการลาคอร์สกลุ่มเล็ก 60 ชั่วโมง',
      course_type: 'group_small',
      course_hours: 60,
      max_students: 5,
      leave_credits: 2, // 2 ครั้ง/ท่าน
      effective_date: '2024-01-01',
      status: 'active',
      created_by: owner.id,
      conditions: JSON.stringify({
        advance_notice_hours: 24,
        deadline_time: '20:00',
        makeup_classes_allowed: true,
        institute_scheduled_only: true,
        notes: 'คลาสกลุ่ม 3-5 ท่าน'
      })
    },
    {
      id: 8,
      branch_id: branch.id,
      rule_name: 'ระเบียบการลาคอร์สกลุ่มเล็ก 50 ชั่วโมง',
      course_type: 'group_small',
      course_hours: 50,
      max_students: 5,
      leave_credits: 1, // 1 ครั้ง/ท่าน
      effective_date: '2024-01-01',
      status: 'active',
      created_by: owner.id,
      conditions: JSON.stringify({
        advance_notice_hours: 24,
        deadline_time: '20:00',
        makeup_classes_allowed: true,
        institute_scheduled_only: true
      })
    },
    {
      id: 9,
      branch_id: branch.id,
      rule_name: 'ระเบียบการลาคอร์สกลุ่มเล็ก 40 ชั่วโมง',
      course_type: 'group_small',
      course_hours: 40,
      max_students: 5,
      leave_credits: 1, // 1 ครั้ง/ท่าน
      effective_date: '2024-01-01',
      status: 'active',
      created_by: owner.id,
      conditions: JSON.stringify({
        advance_notice_hours: 24,
        deadline_time: '20:00',
        makeup_classes_allowed: true,
        institute_scheduled_only: true
      })
    }
  ];

  // Insert leave policy rules
  await knex('leave_policy_rules').insert(leavePolicyRules);

  // Create permissions for each rule (owner has edit permissions)
  const permissions = leavePolicyRules.map(rule => ({
    policy_rule_id: rule.id,
    user_id: owner.id,
    permission_type: 'edit',
    granted_by: owner.id
  }));

  await knex('leave_policy_permissions').insert(permissions);

  // Create initial change history for each rule
  const changes = leavePolicyRules.map(rule => ({
    policy_rule_id: rule.id,
    change_type: 'create',
    changed_by: owner.id,
    change_reason: 'Initial creation of leave policy rule based on institute requirements',
    old_values: null,
    new_values: JSON.stringify({
      rule_name: rule.rule_name,
      course_type: rule.course_type,
      course_hours: rule.course_hours,
      max_students: rule.max_students,
      leave_credits: rule.leave_credits,
      conditions: rule.conditions
    }),
    field_changes: `Created leave policy rule: ${rule.rule_name}`,
    status: 'applied',
    applied_at: now
  }));

  await knex('leave_policy_changes').insert(changes);

  // Create sample room notifications
  const rooms = await knex('rooms').select('*').limit(3);
  const teachers = await knex('teachers').select('*').limit(2);

  if (rooms.length > 0 && teachers.length > 0) {
    const roomNotifications = [
      {
        branch_id: branch.id,
        room_id: rooms[0].id,
        teacher_id: teachers[0].id,
        notification_type: 'room_available',
        title: 'ห้องว่างพร้อมใช้งาน',
        message: `ห้อง ${rooms[0].room_name} พร้อมใช้งานสำหรับคลาสวันนี้`,
        schedule_time: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        metadata: JSON.stringify({
          room_capacity: rooms[0].capacity,
          equipment_available: true,
          booking_ref: 'BK001'
        })
      },
      {
        branch_id: branch.id,
        room_id: rooms[1] ? rooms[1].id : rooms[0].id,
        teacher_id: teachers[1] ? teachers[1].id : teachers[0].id,
        notification_type: 'room_conflict',
        title: 'การจองห้องซ้อนกัน',
        message: 'พบการจองห้องซ้อนกันในช่วงเวลา 14:00-16:00 กรุณาเลือกห้องอื่น',
        schedule_time: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
        metadata: JSON.stringify({
          conflicting_bookings: ['BK002', 'BK003'],
          suggested_alternatives: ['ห้อง A2', 'ห้อง B1'],
          priority: 'high'
        })
      }
    ];

    await knex('room_notifications').insert(roomNotifications);
  }

  console.log('✅ Phase 3 leave policy seed data created successfully!');
  console.log(`📋 Created ${leavePolicyRules.length} leave policy rules`);
  console.log(`🔑 Created ${permissions.length} permission entries`);
  console.log(`📝 Created ${changes.length} change history records`);
  if (rooms.length > 0 && teachers.length > 0) {
    console.log('🏫 Created sample room notifications');
  }
};