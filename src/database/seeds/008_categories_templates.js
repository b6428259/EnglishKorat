/**
 * Seed data for course categories and notification templates
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Clear existing entries
  await knex('notification_templates').del();
  await knex('course_categories').del();
  
  // Insert course categories
  await knex('course_categories').insert([
    {
      id: 1,
      name: 'คอร์สสนทนาเด็ก',
      name_en: 'Kids Conversation',
      description: 'คอร์สสนทนาภาษาอังกฤษสำหรับเด็ก',
      description_en: 'English conversation courses for children',
      type: 'conversation',
      sort_order: 1
    },
    {
      id: 2,
      name: 'คอร์สสนทนาผู้ใหญ่',
      name_en: 'Adults Conversation',
      description: 'คอร์สสนทนาภาษาอังกฤษสำหรับผู้ใหญ่',
      description_en: 'English conversation courses for adults',
      type: 'conversation',
      sort_order: 2
    },
    {
      id: 3,
      name: 'คอร์ส 4 ทักษะ',
      name_en: 'English 4 Skills',
      description: 'คอร์สเรียนภาษาอังกฤษครบ 4 ทักษะ',
      description_en: 'Comprehensive English 4 skills course',
      type: 'skills',
      sort_order: 3
    },
    {
      id: 4,
      name: 'คอร์สเตรียมสอบ IELTS',
      name_en: 'IELTS Preparation',
      description: 'คอร์สเตรียมสอบ IELTS',
      description_en: 'IELTS test preparation course',
      type: 'test_prep',
      sort_order: 4
    },
    {
      id: 5,
      name: 'คอร์สเตรียมสอบ TOEIC',
      name_en: 'TOEIC Preparation',
      description: 'คอร์สเตรียมสอบ TOEIC',
      description_en: 'TOEIC test preparation course',
      type: 'test_prep',
      sort_order: 5
    },
    {
      id: 6,
      name: 'คอร์สเตรียมสอบ TOEFL',
      name_en: 'TOEFL Preparation',
      description: 'คอร์สเตรียมสอบ TOEFL',
      description_en: 'TOEFL test preparation course',
      type: 'test_prep',
      sort_order: 6
    },
    {
      id: 7,
      name: 'คอร์สภาษาจีนสนทนา',
      name_en: 'Chinese Conversation',
      description: 'คอร์สสนทนาภาษาจีน',
      description_en: 'Chinese conversation course',
      type: 'language',
      sort_order: 7
    },
    {
      id: 8,
      name: 'คอร์สภาษาจีน 4 ทักษะ',
      name_en: 'Chinese 4 Skills',
      description: 'คอร์สภาษาจีนครบ 4 ทักษะ',
      description_en: 'Comprehensive Chinese 4 skills course',
      type: 'language',
      sort_order: 8
    }
  ]);

  // Insert notification templates
  await knex('notification_templates').insert([
    {
      type: 'class_confirmation',
      title_th: 'ยืนยันการเข้าเรียน',
      title_en: 'Class Confirmation',
      message_th: 'กรุณายืนยันการเข้าเรียนคลาส {{course_name}} วันที่ {{date}} เวลา {{time}} ห้อง {{room}}',
      message_en: 'Please confirm your attendance for {{course_name}} class on {{date}} at {{time}} in room {{room}}',
      variables: JSON.stringify(['course_name', 'date', 'time', 'room', 'teacher_name']),
      active: true
    },
    {
      type: 'leave_approval',
      title_th: 'การอนุมัติการลา',
      title_en: 'Leave Request Approval',
      message_th: 'คำขอลาของคุณสำหรับคลาส {{course_name}} วันที่ {{date}} {{status}}',
      message_en: 'Your leave request for {{course_name}} class on {{date}} has been {{status}}',
      variables: JSON.stringify(['course_name', 'date', 'status', 'reason', 'admin_name']),
      active: true
    },
    {
      type: 'class_cancellation',
      title_th: 'ยกเลิกคลาสเรียน',
      title_en: 'Class Cancellation',
      message_th: 'คลาส {{course_name}} วันที่ {{date}} เวลา {{time}} ถูกยกเลิก เหตุผล: {{reason}}',
      message_en: 'Class {{course_name}} on {{date}} at {{time}} has been cancelled. Reason: {{reason}}',
      variables: JSON.stringify(['course_name', 'date', 'time', 'reason', 'makeup_info']),
      active: true
    },
    {
      type: 'schedule_change',
      title_th: 'เปลี่ยนแปลงตารางเรียน',
      title_en: 'Schedule Change',
      message_th: 'ตารางเรียน {{course_name}} มีการเปลี่ยนแปลง: {{changes}}',
      message_en: 'Schedule change for {{course_name}}: {{changes}}',
      variables: JSON.stringify(['course_name', 'changes', 'old_schedule', 'new_schedule']),
      active: true
    },
    {
      type: 'payment_reminder',
      title_th: 'แจ้งเตือนการชำระเงิน',
      title_en: 'Payment Reminder',
      message_th: 'กรุณาชำระค่าเรียน {{amount}} บาท ภายในวันที่ {{due_date}}',
      message_en: 'Please pay {{amount}} THB by {{due_date}}',
      variables: JSON.stringify(['amount', 'due_date', 'course_name', 'bill_number']),
      active: true
    },
    {
      type: 'report_deadline',
      title_th: 'แจ้งเตือนส่งรายงาน',
      title_en: 'Report Submission Deadline',
      message_th: 'กรุณาส่งรายงานการสอนสำหรับคลาส {{course_name}} ภายในวันที่ {{deadline}}',
      message_en: 'Please submit teaching report for {{course_name}} by {{deadline}}',
      variables: JSON.stringify(['course_name', 'deadline', 'class_date']),
      active: true
    }
  ]);

  console.log('✅ Course categories and notification templates seeded successfully');
};