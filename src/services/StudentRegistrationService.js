/**
 * Student Registration Service
 * Handles the comprehensive student registration flow including pre-test and post-test registration,
 * document upload, and initial status assignment
 */

const { db } = require('../config/database');
const NotificationService = require('../utils/NotificationService');

class StudentRegistrationService {
  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Register student for pre-test (Google Form #1 equivalent)
   * @param {Object} preTestData - Basic student information
   * @returns {Object} Registration record
   */
  async registerForPreTest(preTestData) {
    const {
      user_id,
      first_name,
      last_name,
      nickname,
      age,
      grade_level,
      contact_source,
      learning_goals,
      referral_source,
      admin_id
    } = preTestData;

    // Determine age group based on age and grade level
    const age_group = this.determineAgeGroup(age, grade_level);
    
    // Determine test type based on age group
    const test_type = age_group === 'kids' ? 'paper_based' : 'online_cefr';

    try {
      // Start transaction
      const registration = await db.transaction(async (trx) => {
        // Create student registration record
        const [registrationId] = await trx('student_registrations').insert({
          user_id,
          test_type,
          learning_goals,
          referral_source,
          admin_id,
          status: 'pending',
          test_date: null,
          created_at: new Date(),
          updated_at: new Date()
        });

        // Create or update student record
        const existingStudent = await trx('students').where('user_id', user_id).first();
        
        if (existingStudent) {
          // Update existing student
          await trx('students').where('user_id', user_id).update({
            first_name,
            last_name,
            nickname,
            age,
            grade_level,
            age_group,
            contact_source,
            registration_status: 'finding_group',
            last_status_update: new Date(),
            updated_at: new Date()
          });
        } else {
          // Create new student record
          await trx('students').insert({
            user_id,
            first_name,
            last_name,
            nickname,
            age,
            grade_level,
            age_group,
            contact_source,
            registration_status: 'finding_group',
            last_status_update: new Date(),
            created_at: new Date(),
            updated_at: new Date()
          });
        }

        return { id: registrationId, test_type, age_group };
      });

      // Send notification about successful pre-test registration
      await this.notificationService.sendNotification(
        'registration_confirmation',
        user_id,
        {
          student_name: `${first_name} ${last_name}`,
          test_type: registration.test_type,
          next_steps: registration.test_type === 'paper_based' ? 
            'กรุณามาทำแบบทดสอบที่สถาบัน' : 
            'กรุณาทำแบบทดสอบออนไลน์ตามลิงก์ที่ส่งให้'
        }
      );

      return registration;
    } catch (error) {
      throw new Error(`Pre-test registration failed: ${error.message}`);
    }
  }

  /**
   * Submit test results and move to post-test registration
   * @param {Object} testData - Test scores and evidence
   * @returns {Object} Updated registration with CEFR level
   */
  async submitTestResults(testData) {
    const {
      registration_id,
      student_id,
      grammar_score,
      speaking_score,
      listening_score,
      reading_score,
      writing_score,
      test_evidence_files,
      conducted_by,
      notes
    } = testData;

    try {
      // Calculate CEFR level based on scores
      const cefr_level = this.calculateCEFRLevel({
        grammar_score,
        speaking_score,
        listening_score,
        reading_score,
        writing_score
      });

      await db.transaction(async (trx) => {
        // Update registration with test results
        await trx('student_registrations').where('id', registration_id).update({
          grammar_score,
          speaking_score,
          listening_score,
          cefr_level,
          test_evidence_files: JSON.stringify(test_evidence_files || []),
          status: 'approved',
          approved_at: new Date(),
          updated_at: new Date()
        });

        // Create test result record
        await trx('test_results').insert({
          student_id,
          registration_id,
          grammar_score,
          speaking_score,
          listening_score,
          reading_score,
          writing_score,
          cefr_level,
          test_date: new Date(),
          conducted_by,
          notes,
          created_at: new Date(),
          updated_at: new Date()
        });

        // Update student with test scores and CEFR level
        await trx('students').where('id', student_id).update({
          cefr_level,
          grammar_score,
          speaking_score,
          listening_score,
          reading_score,
          writing_score,
          updated_at: new Date()
        });
      });

      return { cefr_level, registration_id };
    } catch (error) {
      throw new Error(`Test submission failed: ${error.message}`);
    }
  }

  /**
   * Complete post-test registration (Google Form #2 equivalent)
   * @param {Object} postTestData - Course selection and preferences
   * @returns {Object} Final registration status
   */
  async completePostTestRegistration(postTestData) {
    const {
      registration_id,
      student_id,
      course_id,
      learning_option,
      self_formed_group_members,
      availability_schedule,
      unavailable_times,
      preferred_teacher_type,
      deposit_amount
    } = postTestData;

    try {
      await db.transaction(async (trx) => {
        // Update registration with course selection
        await trx('student_registrations').where('id', registration_id).update({
          course_id,
          learning_option,
          self_formed_group_members: JSON.stringify(self_formed_group_members || []),
          status: 'enrolled',
          updated_at: new Date()
        });

        // Update student with preferences and deposit
        await trx('students').where('id', student_id).update({
          preferred_teacher_type,
          availability_schedule: JSON.stringify(availability_schedule || {}),
          unavailable_times: JSON.stringify(unavailable_times || []),
          deposit_amount: deposit_amount || 3000, // Default 3000 THB
          payment_status: deposit_amount > 0 ? 'partial' : 'pending',
          updated_at: new Date()
        });

        // If individual lessons, mark as ready for scheduling
        if (learning_option === 'individual') {
          await trx('students').where('id', student_id).update({
            registration_status: 'ready_to_open_class',
            last_status_update: new Date()
          });
        } else {
          // Add to group waiting list for auto-grouping
          await this.addToWaitingList(student_id, trx);
        }
      });

      // Trigger auto-grouping process for group learners
      if (learning_option !== 'individual') {
        await this.triggerAutoGrouping(student_id);
      }

      return { status: 'completed', learning_option };
    } catch (error) {
      throw new Error(`Post-test registration failed: ${error.message}`);
    }
  }

  /**
   * Add student to group waiting list
   * @private
   */
  async addToWaitingList(student_id, trx = db) {
    const student = await trx('students').where('id', student_id).first();
    
    if (!student) {
      throw new Error('Student not found');
    }

    // Parse availability schedule
    const availableSchedule = JSON.parse(student.availability_schedule || '{}');

    await trx('group_waiting_list').insert({
      student_id,
      required_cefr_level: student.cefr_level,
      required_age_group: student.age_group,
      available_schedule: JSON.stringify(availableSchedule),
      waiting_since: new Date(),
      days_waiting: 0,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  /**
   * Trigger auto-grouping algorithm
   * @private
   */
  async triggerAutoGrouping(student_id) {
    // This will be implemented in GroupFormationService
    const GroupFormationService = require('./GroupFormationService');
    const groupService = new GroupFormationService();
    
    return await groupService.attemptAutoGrouping(student_id);
  }

  /**
   * Determine age group based on age and grade level
   * @private
   */
  determineAgeGroup(age, grade_level) {
    if (grade_level && parseInt(grade_level) <= 6) {
      return 'kids';
    }
    if (age && age >= 17) {
      return 'adults';
    }
    return 'students';
  }

  /**
   * Calculate CEFR level based on test scores
   * @private
   */
  calculateCEFRLevel(scores) {
    const { grammar_score = 0, speaking_score = 0, listening_score = 0, reading_score = 0, writing_score = 0 } = scores;
    
    // Calculate average score (weights can be adjusted)
    const average = (grammar_score + speaking_score + listening_score + reading_score + writing_score) / 5;
    
    if (average >= 90) return 'C2';
    if (average >= 80) return 'C1';
    if (average >= 70) return 'B2';
    if (average >= 60) return 'B1';
    if (average >= 50) return 'A2';
    if (average >= 40) return 'A1';
    return 'pre A1';
  }

  /**
   * Get registration status for a student
   */
  async getRegistrationStatus(student_id) {
    try {
      const student = await db('students')
        .leftJoin('student_registrations', 'students.user_id', 'student_registrations.user_id')
        .leftJoin('group_waiting_list', 'students.id', 'group_waiting_list.student_id')
        .select(
          'students.*',
          'student_registrations.status as registration_status_detailed',
          'student_registrations.test_type',
          'group_waiting_list.waiting_since',
          'group_waiting_list.days_waiting'
        )
        .where('students.id', student_id)
        .first();

      return student;
    } catch (error) {
      throw new Error(`Failed to get registration status: ${error.message}`);
    }
  }
}

module.exports = StudentRegistrationService;