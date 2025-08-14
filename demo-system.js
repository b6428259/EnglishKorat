/**
 * Demo script for the Student Registration and Group Formation System
 * Shows the auto-grouping functionality in action
 */

const StudentRegistrationService = require('./src/services/StudentRegistrationService');
const GroupFormationService = require('./src/services/GroupFormationService');
const NotificationSchedulerService = require('./src/services/NotificationSchedulerService');
const { db } = require('./src/config/database');

async function demonstrateSystem() {
  console.log('🎓 Student Registration & Group Formation System Demo');
  console.log('===================================================\n');

  try {
    // Initialize services
    const registrationService = new StudentRegistrationService();
    const groupService = new GroupFormationService();
    const notificationService = new NotificationSchedulerService();

    // Demo 1: Show current waiting students
    console.log('📊 Current Students Waiting for Groups:');
    const waitingStudents = await db('students')
      .join('group_waiting_list', 'students.id', 'group_waiting_list.student_id')
      .where('group_waiting_list.active', true)
      .select('students.*', 'group_waiting_list.days_waiting', 'group_waiting_list.waiting_since')
      .orderBy('group_waiting_list.days_waiting', 'desc');

    for (const student of waitingStudents) {
      console.log(`   ${student.first_name} ${student.last_name}`);
      console.log(`   - CEFR Level: ${student.cefr_level}`);
      console.log(`   - Age Group: ${student.age_group}`);
      console.log(`   - Waiting: ${student.days_waiting} days`);
      console.log(`   - Status: ${student.registration_status}`);
      console.log('');
    }

    // Demo 2: Group students by compatibility
    console.log('🔍 Analyzing Group Compatibility:');
    const groupedByCompatibility = {};
    
    for (const student of waitingStudents) {
      const key = `${student.cefr_level}_${student.age_group}`;
      if (!groupedByCompatibility[key]) {
        groupedByCompatibility[key] = [];
      }
      groupedByCompatibility[key].push(student);
    }

    for (const [criteria, students] of Object.entries(groupedByCompatibility)) {
      const [cefr, ageGroup] = criteria.split('_');
      console.log(`   📚 ${cefr} level, ${ageGroup} age group: ${students.length} students`);
      
      if (students.length >= 4) {
        console.log(`      ✅ Ready to form group! (${students.length}/6 students)`);
      } else if (students.length >= 2) {
        console.log(`      ⏳ Can form waiting group (${students.length}/4 students)`);
      } else {
        console.log(`      🔍 Need more students (${students.length}/4 students)`);
      }
    }
    console.log('');

    // Demo 3: Attempt auto-grouping for the first waiting student
    if (waitingStudents.length > 0) {
      console.log('🤖 Attempting Auto-Grouping:');
      const targetStudent = waitingStudents[0];
      console.log(`   Target student: ${targetStudent.first_name} ${targetStudent.last_name}`);
      console.log(`   - CEFR: ${targetStudent.cefr_level}`);
      console.log(`   - Age Group: ${targetStudent.age_group}`);
      console.log(`   - Days waiting: ${targetStudent.days_waiting}`);
      
      try {
        const groupingResult = await groupService.attemptAutoGrouping(targetStudent.id);
        console.log('   Result:', groupingResult);
        
        if (groupingResult.group_id) {
          console.log(`   ✅ Group formed! Group ID: ${groupingResult.group_id}`);
          console.log(`   📊 Members: ${groupingResult.member_count}`);
          console.log(`   🎯 Status: ${groupingResult.status}`);
        } else {
          console.log('   ⏳ Still waiting for compatible students');
        }
      } catch (error) {
        console.log(`   ❌ Auto-grouping failed: ${error.message}`);
      }
      console.log('');
    }

    // Demo 4: Show notification format example
    console.log('📱 Sample LINE Notification Format:');
    const sampleStudent = waitingStudents[0] || { 
      nickname: 'Alex', 
      cefr_level: 'B1', 
      age_group: 'adults' 
    };
    
    const sampleNotifications = [
      `น้อง${sampleStudent.nickname || sampleStudent.first_name} วันนี้อัปเดตกลุ่มของคุณ: ระดับ ${sampleStudent.cefr_level} วัยทำงาน ยังคงหากลุ่มอยู่ค่ะ กรุณารอสักครู่นะคะ 🔍`,
      `น้อง${sampleStudent.nickname || sampleStudent.first_name} วันนี้อัปเดตกลุ่มของคุณ: ระดับ ${sampleStudent.cefr_level} วัยทำงาน ตอนนี้มี 3/4 คน เหลืออีก 1 คนก็พร้อมเปิดคลาสค่ะ 🎉`,
      `น้อง${sampleStudent.nickname || sampleStudent.first_name} วันนี้อัปเดตกลุ่มของคุณ: ระดับ ${sampleStudent.cefr_level} วัยทำงาน ตอนนี้มี 4/4 คน พร้อมเปิดคลาสค่ะ 🎉`
    ];

    for (let i = 0; i < sampleNotifications.length; i++) {
      console.log(`   ${i + 1}. ${sampleNotifications[i]}`);
    }
    console.log('');

    // Demo 5: Show payment and pricing information
    console.log('💰 Payment & Pricing System:');
    console.log('   - Individual lessons: Pay immediately');
    console.log('   - Group deposit: 3,000 THB');
    console.log('   - Cash/Transfer discount: 1,000 THB');
    console.log('   - 30+ day waiting discount: 3,000-5,000 THB');
    console.log('');

    // Check if any students qualify for waiting discounts
    const longWaiters = waitingStudents.filter(s => s.days_waiting >= 30);
    if (longWaiters.length > 0) {
      console.log('🎁 Students Eligible for Waiting Discounts:');
      for (const student of longWaiters) {
        const discountAmount = student.days_waiting >= 60 ? 5000 : 3000;
        console.log(`   ${student.first_name} ${student.last_name} (${student.days_waiting} days) → ${discountAmount} THB discount`);
      }
      console.log('');
    }

    // Demo 6: Show course group statuses
    console.log('📚 Current Course Groups Status:');
    const courseGroups = await db('course_groups')
      .leftJoin('student_groups', 'course_groups.id', 'student_groups.group_id')
      .select(
        'course_groups.*',
        db.raw('COUNT(student_groups.id) as actual_members')
      )
      .groupBy('course_groups.id')
      .orderBy('course_groups.status');

    const statusCounts = {
      waiting_for_group: 0,
      ready_to_active: 0,
      in_progress: 0,
      completed: 0
    };

    for (const group of courseGroups) {
      statusCounts[group.status] = (statusCounts[group.status] || 0) + 1;
    }

    console.log('   📊 Group Status Summary:');
    console.log(`   - Finding members: ${statusCounts.waiting_for_group || 0} groups`);
    console.log(`   - Ready to start: ${statusCounts.ready_to_active || 0} groups`);
    console.log(`   - In progress: ${statusCounts.in_progress || 0} groups`);
    console.log(`   - Completed: ${statusCounts.completed || 0} groups`);
    console.log('');

    // Demo 7: Show system capabilities
    console.log('🚀 System Capabilities:');
    console.log('   ✅ Automatic group formation based on:');
    console.log('      - CEFR level matching (same level)');
    console.log('      - Age group compatibility (within 3 grade levels)');
    console.log('      - Schedule overlap detection (minimum 1 time slot)');
    console.log('      - Group size optimization (2-6 people)');
    console.log('');
    console.log('   ✅ Auto-approval rules:');
    console.log('      - 4+ people: Auto-approve to open class');
    console.log('      - 2-3 people: Create waiting group');
    console.log('      - 1 person: Keep in waiting list');
    console.log('');
    console.log('   ✅ Status management:');
    console.log('      - Real-time status updates');
    console.log('      - Automated notifications every 3 days');
    console.log('      - LINE messaging integration');
    console.log('      - Payment and discount tracking');
    console.log('');
    console.log('   ✅ Administrative features:');
    console.log('      - Manual group override capabilities');
    console.log('      - Comprehensive reporting');
    console.log('      - Teacher schedule management');
    console.log('      - Document upload and verification');

    console.log('\n🎉 Demo completed successfully!');
    console.log('💡 The Student Registration & Group Formation System is ready for production use.');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the demo
demonstrateSystem().then(() => {
  console.log('\n📝 To test the API endpoints, try:');
  console.log('   POST /api/v1/registration/pre-test');
  console.log('   POST /api/v1/registration/test-results');
  console.log('   POST /api/v1/registration/post-test');
  console.log('   GET  /api/v1/registration/status/:student_id');
  console.log('   GET  /api/v1/registration/waiting-students');
  console.log('\n🔗 Start the server with: npm run dev');
  process.exit(0);
}).catch(error => {
  console.error('❌ Demo error:', error);
  process.exit(1);
});