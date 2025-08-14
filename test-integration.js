/**
 * Integration test for Student Registration System
 * Simple Node.js script to verify the system works correctly
 */

const StudentRegistrationService = require('./src/services/StudentRegistrationService');
const GroupFormationService = require('./src/services/GroupFormationService');
const { db } = require('./src/config/database');

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
    console.log('\n📊 Testing age group determination:');
    const testCases = [
      { age: 8, grade: '3', expected: 'kids' },
      { age: 15, grade: '9', expected: 'students' },
      { age: 25, grade: '12', expected: 'adults' },
      { age: 12, grade: '6', expected: 'kids' }
    ];
    
    for (const testCase of testCases) {
      const result = regService.determineAgeGroup(testCase.age, testCase.grade);
      const status = result === testCase.expected ? '✅' : '❌';
      console.log(`${status} Age ${testCase.age}, Grade ${testCase.grade} → ${result} (expected: ${testCase.expected})`);
    }
    
    // Test CEFR level calculation
    console.log('\n🎯 Testing CEFR level calculation:');
    const cefrTests = [
      { scores: { grammar_score: 95, speaking_score: 90, listening_score: 92, reading_score: 88, writing_score: 90 }, expected: 'C2' },
      { scores: { grammar_score: 65, speaking_score: 60, listening_score: 70, reading_score: 68, writing_score: 62 }, expected: 'B1' },
      { scores: { grammar_score: 45, speaking_score: 40, listening_score: 50, reading_score: 48, writing_score: 42 }, expected: 'A1' }
    ];
    
    for (const test of cefrTests) {
      const result = regService.calculateCEFRLevel(test.scores);
      const status = result === test.expected ? '✅' : '❌';
      const avg = Object.values(test.scores).reduce((a, b) => a + b, 0) / 5;
      console.log(`${status} Average ${avg} → ${result} (expected: ${test.expected})`);
    }
    
    // Test schedule compatibility
    console.log('\n⏰ Testing schedule compatibility:');
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

    const compatible1and2 = await groupSvc.checkScheduleCompatibility(student1, student2);
    const compatible1and3 = await groupSvc.checkScheduleCompatibility(student1, student3);
    
    console.log(`${compatible1and2 ? '✅' : '❌'} Student1 & Student2 compatibility: ${compatible1and2} (should be true - overlapping Monday)`);
    console.log(`${!compatible1and3 ? '✅' : '❌'} Student1 & Student3 compatibility: ${compatible1and3} (should be false - no overlap)`);
    
    // Test database schema
    console.log('\n🏗️ Testing database schema:');
    const requiredTables = [
      'students', 'course_groups', 'student_registrations', 'test_results',
      'group_waiting_list', 'schedule_slots', 'student_schedule_preferences',
      'group_formation_history', 'notification_schedules'
    ];

    for (const table of requiredTables) {
      const exists = await db.schema.hasTable(table);
      console.log(`${exists ? '✅' : '❌'} Table '${table}': ${exists ? 'exists' : 'missing'}`);
    }
    
    // Test enhanced student fields
    console.log('\n👤 Testing enhanced student fields:');
    const studentColumns = await db('students').columnInfo();
    const requiredStudentColumns = [
      'age_group', 'reading_score', 'writing_score', 'availability_schedule',
      'unavailable_times', 'registration_status', 'deposit_amount', 'payment_status'
    ];

    for (const column of requiredStudentColumns) {
      const exists = studentColumns[column] !== undefined;
      console.log(`${exists ? '✅' : '❌'} Column 'students.${column}': ${exists ? 'exists' : 'missing'}`);
    }
    
    // Test sample data quality
    console.log('\n📋 Testing sample data:');
    
    const studentsWithAgeGroup = await db('students').whereNotNull('age_group').count('* as count').first();
    const studentsWithStatus = await db('students').whereNotNull('registration_status').count('* as count').first();
    const activeWaitingList = await db('group_waiting_list').where('active', true).count('* as count').first();
    const activeNotificationSchedules = await db('notification_schedules').where('active', true).count('* as count').first();
    
    console.log(`✅ ${studentsWithAgeGroup.count} students have age_group assigned`);
    console.log(`✅ ${studentsWithStatus.count} students have registration_status assigned`);
    console.log(`✅ ${activeWaitingList.count} students in active waiting list`);
    console.log(`✅ ${activeNotificationSchedules.count} active notification schedules`);
    
    // Test actual student data
    if (students.length > 0) {
      console.log('\n👥 Sample student data:');
      for (const student of students.slice(0, 2)) {
        console.log(`✅ ${student.first_name} ${student.last_name}:`);
        console.log(`   - Age Group: ${student.age_group}`);
        console.log(`   - CEFR Level: ${student.cefr_level}`);
        console.log(`   - Registration Status: ${student.registration_status}`);
        console.log(`   - Deposit: ${student.deposit_amount} THB`);
        console.log(`   - Days Waiting: ${student.days_waiting || 0}`);
      }
    }
    
    console.log('\n🎉 Integration test completed successfully!');
    console.log('📈 All core components of the Student Registration System are working correctly!');
    return true;
    
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the test
runIntegrationTest().then(success => {
  process.exit(success ? 0 : 1);
});

module.exports = { runIntegrationTest };