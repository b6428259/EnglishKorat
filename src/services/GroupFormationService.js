/**
 * Group Formation Service
 * Handles automatic group formation based on CEFR level, age group, and schedule compatibility
 * Implements the auto-grouping rules as specified in the requirements
 */

const { db } = require('../config/database');
const NotificationService = require('../utils/NotificationService');

class GroupFormationService {
  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Attempt to auto-group a student
   * @param {number} student_id - Student to be grouped
   * @returns {Object} Grouping result
   */
  async attemptAutoGrouping(student_id) {
    try {
      const student = await this.getStudentWithWaitingInfo(student_id);
      
      if (!student) {
        throw new Error('Student not found');
      }

      // Find compatible students
      const compatibleStudents = await this.findCompatibleStudents(student);
      
      // Try to form a group
      const groupResult = await this.formGroup(student, compatibleStudents);
      
      // Update waiting list status
      await this.updateWaitingDays();
      
      return groupResult;
    } catch (error) {
      throw new Error(`Auto-grouping failed: ${error.message}`);
    }
  }

  /**
   * Get student with waiting list information
   * @private
   */
  async getStudentWithWaitingInfo(student_id) {
    return await db('students')
      .leftJoin('group_waiting_list', 'students.id', 'group_waiting_list.student_id')
      .leftJoin('student_registrations', 'students.user_id', 'student_registrations.user_id')
      .select(
        'students.*',
        'group_waiting_list.available_schedule',
        'group_waiting_list.waiting_since',
        'group_waiting_list.days_waiting',
        'student_registrations.learning_option',
        'student_registrations.course_id'
      )
      .where('students.id', student_id)
      .where('group_waiting_list.active', true)
      .first();
  }

  /**
   * Find students compatible for grouping
   * @private
   */
  async findCompatibleStudents(targetStudent) {
    const compatibleStudents = await db('students')
      .join('group_waiting_list', 'students.id', 'group_waiting_list.student_id')
      .leftJoin('student_registrations', 'students.user_id', 'student_registrations.user_id')
      .select(
        'students.*',
        'group_waiting_list.available_schedule',
        'group_waiting_list.waiting_since',
        'group_waiting_list.days_waiting',
        'student_registrations.course_id'
      )
      .where('students.cefr_level', targetStudent.cefr_level) // Same CEFR level
      .where('students.age_group', targetStudent.age_group) // Same age group
      .where('group_waiting_list.active', true)
      .where('students.id', '!=', targetStudent.id) // Exclude target student
      .where('students.registration_status', 'finding_group');

    // Filter by schedule compatibility
    const scheduleCompatible = [];
    for (const student of compatibleStudents) {
      if (await this.checkScheduleCompatibility(targetStudent, student)) {
        scheduleCompatible.push(student);
      }
    }

    return scheduleCompatible;
  }

  /**
   * Check if two students have compatible schedules (at least 1 overlapping time slot)
   * @private
   */
  async checkScheduleCompatibility(student1, student2) {
    try {
      const schedule1 = JSON.parse(student1.available_schedule || '{}');
      const schedule2 = JSON.parse(student2.available_schedule || '{}');

      // Check for at least one overlapping time slot
      for (const day in schedule1) {
        if (schedule2[day]) {
          const slots1 = schedule1[day];
          const slots2 = schedule2[day];
          
          // Check if any time slots overlap
          for (const slot1 of slots1) {
            for (const slot2 of slots2) {
              if (this.timeSlotsOverlap(slot1, slot2)) {
                return true;
              }
            }
          }
        }
      }
      
      return false;
    } catch (error) {
      // If schedule parsing fails, assume compatible
      return true;
    }
  }

  /**
   * Check if two time slots overlap
   * @private
   */
  timeSlotsOverlap(slot1, slot2) {
    const start1 = new Date(`2000-01-01T${slot1.start_time}`);
    const end1 = new Date(`2000-01-01T${slot1.end_time}`);
    const start2 = new Date(`2000-01-01T${slot2.start_time}`);
    const end2 = new Date(`2000-01-01T${slot2.end_time}`);

    return start1 < end2 && start2 < end1;
  }

  /**
   * Form a group with compatible students
   * @private
   */
  async formGroup(targetStudent, compatibleStudents) {
    try {
      const allStudents = [targetStudent, ...compatibleStudents];
      
      // Auto-grouping rules:
      // 4+ people: Auto-approve to open class
      // Less than 4: Wait for more students
      
      if (allStudents.length >= 4) {
        // Auto-approve group
        return await this.createGroup(allStudents, true);
      } else if (allStudents.length >= 2) {
        // Create waiting group
        return await this.createWaitingGroup(allStudents);
      } else {
        // Keep in waiting list
        return await this.updateStudentStatus(targetStudent.id, 'finding_group', allStudents.length);
      }
    } catch (error) {
      throw new Error(`Group formation failed: ${error.message}`);
    }
  }

  /**
   * Create an approved group (4+ students)
   * @private
   */
  async createGroup(students, autoApproved = false) {
    return await db.transaction(async (trx) => {
      // Create course group
      const [groupId] = await trx('course_groups').insert({
        course_id: students[0].course_id,
        group_name: `Auto Group ${new Date().getTime()}`,
        required_cefr_level: students[0].cefr_level,
        required_age_group: students[0].age_group,
        current_students: students.length,
        target_students: Math.min(6, students.length + 2), // Allow room for growth
        min_students: 4,
        auto_formed: true,
        formation_type: 'institute_arranged',
        status: autoApproved ? 'ready_to_active' : 'waiting_for_group',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Add students to group
      const studentGroupInserts = students.map(student => ({
        group_id: groupId,
        student_id: student.id,
        enrollment_date: new Date(),
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      }));

      await trx('student_groups').insert(studentGroupInserts);

      // Update student statuses
      const newStatus = autoApproved ? 'ready_to_open_class' : 'has_group_members';
      for (const student of students) {
        await trx('students').where('id', student.id).update({
          registration_status: newStatus,
          last_status_update: new Date(),
          updated_at: new Date()
        });

        // Remove from waiting list
        await trx('group_waiting_list')
          .where('student_id', student.id)
          .update({ active: false });

        // Record formation history
        await trx('group_formation_history').insert({
          group_id: groupId,
          student_id: student.id,
          action: 'added',
          new_status: newStatus,
          auto_generated: true,
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      // Send notifications
      for (const student of students) {
        await this.sendGroupFormationNotification(student, {
          group_id: groupId,
          current_members: students.length,
          target_members: Math.min(6, students.length + 2),
          status: autoApproved ? 'พร้อมเปิดคลาส' : `มี ${students.length} คน`,
          cefr_level: students[0].cefr_level,
          age_group: students[0].age_group
        });
      }

      return {
        group_id: groupId,
        status: autoApproved ? 'approved' : 'waiting',
        member_count: students.length,
        auto_approved: autoApproved
      };
    });
  }

  /**
   * Create a waiting group (2-3 students)
   * @private
   */
  async createWaitingGroup(students) {
    return await this.createGroup(students, false);
  }

  /**
   * Update student status with group information
   * @private
   */
  async updateStudentStatus(student_id, status, currentGroupSize = 0) {
    await db('students').where('id', student_id).update({
      registration_status: status,
      last_status_update: new Date(),
      updated_at: new Date()
    });

    // Send notification about current status
    const student = await db('students').where('id', student_id).first();
    await this.sendStatusUpdateNotification(student, {
      status,
      current_members: currentGroupSize,
      waiting_for: Math.max(1, 4 - currentGroupSize)
    });

    return { status, current_group_size: currentGroupSize };
  }

  /**
   * Update waiting days for all students in waiting list
   * @private
   */
  async updateWaitingDays() {
    const waitingStudents = await db('group_waiting_list')
      .where('active', true)
      .select('student_id', 'waiting_since');

    for (const student of waitingStudents) {
      const daysSince = Math.floor((new Date() - new Date(student.waiting_since)) / (1000 * 60 * 60 * 24));
      
      await db('group_waiting_list')
        .where('student_id', student.student_id)
        .update({ days_waiting: daysSince });

      await db('students')
        .where('id', student.student_id)
        .update({ days_waiting: daysSince });

      // Offer discounts for 30+ day waiters
      if (daysSince >= 30) {
        await this.offerWaitingDiscount(student.student_id, daysSince);
      }
    }
  }

  /**
   * Offer discount for students waiting 30+ days
   * @private
   */
  async offerWaitingDiscount(student_id, daysWaiting) {
    const discountAmount = daysWaiting >= 60 ? 5000 : 3000; // 5000 for 60+ days, 3000 for 30+ days
    
    const registration = await db('student_registrations')
      .join('students', 'student_registrations.user_id', 'students.user_id')
      .where('students.id', student_id)
      .first();

    if (registration && (!registration.offered_discount || registration.offered_discount < discountAmount)) {
      await db('student_registrations')
        .where('id', registration.id)
        .update({
          offered_discount: discountAmount,
          discount_valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days validity
          updated_at: new Date()
        });

      // Send discount notification
      await this.sendDiscountNotification(student_id, discountAmount, daysWaiting);
    }
  }

  /**
   * Send group formation notification
   * @private
   */
  async sendGroupFormationNotification(student, groupInfo) {
    const nickname = student.nickname || student.first_name;
    const message = `น้อง${nickname} วันนี้อัปเดตกลุ่มของคุณ: ระดับ ${groupInfo.cefr_level} ${this.getAgeGroupName(groupInfo.age_group)} ตอนนี้มี ${groupInfo.current_members}/${groupInfo.target_members} คน ${groupInfo.status === 'พร้อมเปิดคลาส' ? 'พร้อมเปิดคลาสค่ะ 🎉' : `เหลืออีก ${groupInfo.target_members - groupInfo.current_members} คนก็พร้อมเปิดคลาสค่ะ 🎉`}`;

    await this.notificationService.sendNotification(
      'group_update',
      student.user_id,
      {
        message,
        group_id: groupInfo.group_id,
        current_members: groupInfo.current_members,
        target_members: groupInfo.target_members,
        cefr_level: groupInfo.cefr_level,
        age_group: groupInfo.age_group
      }
    );
  }

  /**
   * Send status update notification
   * @private
   */
  async sendStatusUpdateNotification(student, statusInfo) {
    const nickname = student.nickname || student.first_name;
    let message = `น้อง${nickname} สถานะปัจจุบัน: ${this.getStatusMessage(statusInfo.status)}`;
    
    if (statusInfo.current_members > 0) {
      message += ` มีสมาชิกในกลุ่ม ${statusInfo.current_members} คน`;
    }

    await this.notificationService.sendNotification(
      'status_update',
      student.user_id,
      { message, ...statusInfo }
    );
  }

  /**
   * Send discount notification
   * @private
   */
  async sendDiscountNotification(student_id, discountAmount, daysWaiting) {
    const student = await db('students').where('id', student_id).first();
    const nickname = student.nickname || student.first_name;
    
    const message = `น้อง${nickname} เนื่องจากรอคิวเป็นเวลา ${daysWaiting} วัน เราขอมอบส่วนลดพิเศษ ${discountAmount.toLocaleString()} บาท ให้กับคุณค่ะ 🎁`;

    await this.notificationService.sendNotification(
      'waiting_discount',
      student.user_id,
      {
        message,
        discount_amount: discountAmount,
        days_waiting: daysWaiting,
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    );
  }

  /**
   * Get age group display name in Thai
   * @private
   */
  getAgeGroupName(ageGroup) {
    switch (ageGroup) {
      case 'kids': return 'เด็ก';
      case 'students': return 'นักเรียน';
      case 'adults': return 'วัยทำงาน';
      default: return 'ทั่วไป';
    }
  }

  /**
   * Get status message in Thai
   * @private
   */
  getStatusMessage(status) {
    switch (status) {
      case 'finding_group': return 'กำลังหากลุ่ม';
      case 'has_group_members': return 'มีสมาชิกกลุ่มแล้ว';
      case 'ready_to_open_class': return 'พร้อมเปิดคลาส';
      case 'arranging_schedule': return 'กำลังจัดตารางเรียน';
      case 'schedule_confirmed': return 'ยืนยันตารางเรียนแล้ว';
      case 'class_started': return 'เริ่มเรียนแล้ว';
      default: return status;
    }
  }

  /**
   * Check and handle group size changes (for students leaving)
   */
  async handleGroupSizeChange(group_id) {
    const group = await db('course_groups').where('id', group_id).first();
    const currentMembers = await db('student_groups')
      .where('group_id', group_id)
      .where('status', 'active')
      .count('* as count')
      .first();

    const memberCount = currentMembers.count;

    if (memberCount <= 1) {
      // Return remaining students to waiting list
      await this.returnStudentsToWaitingList(group_id);
    } else if (memberCount < 4 && group.status === 'ready_to_active') {
      // Downgrade group status
      await db('course_groups').where('id', group_id).update({
        status: 'waiting_for_group',
        updated_at: new Date()
      });

      // Update student statuses
      const students = await db('students')
        .join('student_groups', 'students.id', 'student_groups.student_id')
        .where('student_groups.group_id', group_id)
        .where('student_groups.status', 'active')
        .select('students.*');

      for (const student of students) {
        await db('students').where('id', student.id).update({
          registration_status: 'has_group_members',
          last_status_update: new Date()
        });
      }
    }

    // Update current_students count
    await db('course_groups').where('id', group_id).update({
      current_students: memberCount,
      updated_at: new Date()
    });

    return { group_id, new_member_count: memberCount };
  }

  /**
   * Return students to waiting list when group dissolves
   * @private
   */
  async returnStudentsToWaitingList(group_id) {
    const students = await db('students')
      .join('student_groups', 'students.id', 'student_groups.student_id')
      .where('student_groups.group_id', group_id)
      .where('student_groups.status', 'active')
      .select('students.*');

    for (const student of students) {
      // Update student status
      await db('students').where('id', student.id).update({
        registration_status: 'finding_group',
        last_status_update: new Date()
      });

      // Reactivate in waiting list
      await db('group_waiting_list')
        .where('student_id', student.id)
        .update({ active: true, updated_at: new Date() });

      // Record history
      await db('group_formation_history').insert({
        group_id,
        student_id: student.id,
        action: 'removed',
        previous_status: 'has_group_members',
        new_status: 'finding_group',
        reason: 'Group dissolved due to insufficient members',
        auto_generated: true,
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    // Deactivate group
    await db('course_groups').where('id', group_id).update({
      status: 'cancelled',
      updated_at: new Date()
    });

    return students.length;
  }
}

module.exports = GroupFormationService;