/**
 * Test file for the Student Registration and Group Formation System
 * Tests the core functionality of the enhanced registration flow
 */

const StudentRegistrationService = require('../src/services/StudentRegistrationService');
const GroupFormationService = require('../src/services/GroupFormationService');
const { db } = require('../src/config/database');

describe('Student Registration and Group Formation System', () => {
  let registrationService;
  let groupService;
  
  beforeAll(() => {
    registrationService = new StudentRegistrationService();
    groupService = new GroupFormationService();
  });

  describe('StudentRegistrationService', () => {
    test('should determine age group correctly', () => {
      // Test age group determination
      expect(registrationService.determineAgeGroup(8, '3')).toBe('kids');
      expect(registrationService.determineAgeGroup(15, '9')).toBe('students');
      expect(registrationService.determineAgeGroup(25, '12')).toBe('adults');
      expect(registrationService.determineAgeGroup(12, '6')).toBe('kids'); // Grade level takes precedence
    });

    test('should calculate CEFR level correctly', () => {
      // Test CEFR level calculation
      expect(registrationService.calculateCEFRLevel({
        grammar_score: 95,
        speaking_score: 90,
        listening_score: 92,
        reading_score: 88,
        writing_score: 90
      })).toBe('C2');

      expect(registrationService.calculateCEFRLevel({
        grammar_score: 65,
        speaking_score: 60,
        listening_score: 70,
        reading_score: 68,
        writing_score: 62
      })).toBe('B1');

      expect(registrationService.calculateCEFRLevel({
        grammar_score: 45,
        speaking_score: 40,
        listening_score: 50,
        reading_score: 48,
        writing_score: 42
      })).toBe('A1');
    });

    test('should handle registration status retrieval', async () => {
      // Get a sample student
      const student = await db('students').first();
      
      if (student) {
        const status = await registrationService.getRegistrationStatus(student.id);
        expect(status).toBeDefined();
        expect(status.id).toBe(student.id);
        expect(status.registration_status).toBeDefined();
      }
    });
  });

  describe('GroupFormationService', () => {
    test('should check schedule compatibility correctly', async () => {
      const student1 = {
        available_schedule: JSON.stringify({
          monday: [{ start_time: '17:00:00', end_time: '19:00:00' }],
          wednesday: [{ start_time: '19:00:00', end_time: '21:00:00' }]
        })
      };

      const student2 = {
        available_schedule: JSON.stringify({
          monday: [{ start_time: '18:00:00', end_time: '20:00:00' }], // Overlaps with student1 Monday
          friday: [{ start_time: '15:00:00', end_time: '17:00:00' }]
        })
      };

      const student3 = {
        available_schedule: JSON.stringify({
          tuesday: [{ start_time: '17:00:00', end_time: '19:00:00' }],
          thursday: [{ start_time: '19:00:00', end_time: '21:00:00' }]
        })
      };

      const compatible1and2 = await groupService.checkScheduleCompatibility(student1, student2);
      const compatible1and3 = await groupService.checkScheduleCompatibility(student1, student3);

      expect(compatible1and2).toBe(true); // Should overlap on Monday
      expect(compatible1and3).toBe(false); // No overlapping days
    });

    test('should handle group size changes correctly', async () => {
      // Find a course group with students
      const group = await db('course_groups')
        .join('student_groups', 'course_groups.id', 'student_groups.group_id')
        .where('student_groups.status', 'active')
        .select('course_groups.*')
        .first();

      if (group) {
        const result = await groupService.handleGroupSizeChange(group.id);
        expect(result).toBeDefined();
        expect(result.group_id).toBe(group.id);
        expect(typeof result.new_member_count).toBe('number');
      }
    });
  });

  describe('Database Schema Validation', () => {
    test('should have all required tables', async () => {
      const tables = [
        'students',
        'course_groups', 
        'student_registrations',
        'test_results',
        'group_waiting_list',
        'schedule_slots',
        'student_schedule_preferences',
        'group_formation_history',
        'notification_schedules'
      ];

      for (const table of tables) {
        const exists = await db.schema.hasTable(table);
        expect(exists).toBe(true);
      }
    });

    test('should have enhanced student fields', async () => {
      const columns = await db('students').columnInfo();
      
      const requiredColumns = [
        'age_group',
        'reading_score',
        'writing_score',
        'availability_schedule',
        'unavailable_times',
        'registration_status',
        'deposit_amount',
        'payment_status',
        'last_status_update',
        'days_waiting'
      ];

      for (const column of requiredColumns) {
        expect(columns[column]).toBeDefined();
      }
    });

    test('should have enhanced course_groups fields', async () => {
      const columns = await db('course_groups').columnInfo();
      
      const requiredColumns = [
        'target_students',
        'min_students',
        'required_cefr_level',
        'required_age_group',
        'schedule_requirements',
        'auto_formed',
        'formation_type'
      ];

      for (const column of requiredColumns) {
        expect(columns[column]).toBeDefined();
      }
    });
  });

  describe('Sample Data Validation', () => {
    test('should have schedule slots', async () => {
      const slots = await db('schedule_slots').select('*');
      expect(slots.length).toBeGreaterThan(0);
      
      // Check that we have slots for different days
      const days = [...new Set(slots.map(s => s.day_of_week))];
      expect(days.length).toBeGreaterThan(1);
    });

    test('should have students in waiting list', async () => {
      const waitingStudents = await db('group_waiting_list')
        .where('active', true)
        .select('*');
      
      expect(waitingStudents.length).toBeGreaterThan(0);
      
      // Check required fields
      for (const student of waitingStudents) {
        expect(student.required_cefr_level).toBeDefined();
        expect(student.required_age_group).toBeDefined();
        expect(student.available_schedule).toBeDefined();
      }
    });

    test('should have notification schedules', async () => {
      const schedules = await db('notification_schedules')
        .where('active', true)
        .select('*');
      
      expect(schedules.length).toBeGreaterThan(0);
      
      // Check that default notification type exists
      const groupUpdates = schedules.filter(s => s.notification_type === 'daily_group_update');
      expect(groupUpdates.length).toBeGreaterThan(0);
    });
  });
});

// Helper function to run a quick integration test
async function runIntegrationTest() {
  console.log('🧪 Running integration test for Student Registration System...');
  
  try {
    // Test database connection
    await db.raw('SELECT 1');
    console.log('✅ Database connection OK');
    
    // Test services instantiation
    const regService = new StudentRegistrationService();
    const groupSvc = new GroupFormationService();
    console.log('✅ Services instantiated OK');
    
    // Test basic data retrieval
    const students = await db('students').limit(3);
    const scheduleSlots = await db('schedule_slots').limit(5);
    const waitingList = await db('group_waiting_list').where('active', true).limit(3);
    
    console.log(`✅ Found ${students.length} students, ${scheduleSlots.length} schedule slots, ${waitingList.length} waiting students`);
    
    // Test age group determination
    const ageGroups = ['kids', 'students', 'adults'];
    for (const student of students) {
      if (student.age_group && ageGroups.includes(student.age_group)) {
        console.log(`✅ Student ${student.first_name} has valid age group: ${student.age_group}`);
      }
    }
    
    console.log('🎉 Integration test completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    return false;
  }
}

// Export the integration test function
module.exports = { runIntegrationTest };

// Run integration test if this file is executed directly
if (require.main === module) {
  runIntegrationTest().then(success => {
    process.exit(success ? 0 : 1);
  });
}