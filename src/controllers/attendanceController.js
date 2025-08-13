const { db } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Mark attendance for a class
// @route   POST /api/v1/attendance
// @access  Private (Teacher, Admin, Owner)
const markAttendance = asyncHandler(async (req, res) => {
  const { class_id, attendances } = req.body;
  // attendances format: [{ student_id, status, notes }]

  // Verify class exists and user has access
  const classInfo = await db('classes')
    .join('course_groups', 'classes.course_group_id', 'course_groups.id')
    .join('courses', 'course_groups.course_id', 'courses.id')
    .join('teachers', 'classes.teacher_id', 'teachers.id')
    .join('users as teacher_users', 'teachers.user_id', 'teacher_users.id')
    .select(
      'classes.*',
      'courses.branch_id',
      'teacher_users.id as teacher_user_id'
    )
    .where('classes.id', class_id)
    .first();

  if (!classInfo) {
    return res.status(404).json({
      success: false,
      message: 'Class not found'
    });
  }

  // Check permissions
  const isTeacher = req.user.role === 'teacher' && classInfo.teacher_user_id === req.user.id;
  const isAdmin = req.user.role === 'admin' && classInfo.branch_id === req.user.branch_id;
  const isOwner = req.user.role === 'owner';

  if (!isTeacher && !isAdmin && !isOwner) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only assigned teacher, admin, or owner can mark attendance.'
    });
  }

  // Get enrolled students for this class
  const enrolledStudents = await db('enrollments')
    .join('students', 'enrollments.student_id', 'students.id')
    .select('students.id', 'students.student_id as student_number')
    .where('enrollments.course_group_id', classInfo.course_group_id)
    .where('enrollments.status', 'active');

  const enrolledStudentIds = enrolledStudents.map(s => s.id);

  // Validate all student IDs are enrolled
  const invalidStudents = attendances.filter(att => !enrolledStudentIds.includes(att.student_id));
  if (invalidStudents.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Some students are not enrolled in this course',
      invalidStudents: invalidStudents.map(s => s.student_id)
    });
  }

  // Process attendance records
  const attendanceRecords = [];
  const trx = await db.transaction();

  try {
    for (const attendance of attendances) {
      const { student_id, status, notes } = attendance;

      // Check if attendance record already exists
      const existingAttendance = await trx('class_attendances')
        .where('class_id', class_id)
        .where('student_id', student_id)
        .first();

      if (existingAttendance) {
        // Update existing record
        await trx('class_attendances')
          .where('class_id', class_id)
          .where('student_id', student_id)
          .update({
            status,
            notes: notes || existingAttendance.notes
          });

        attendanceRecords.push({
          ...existingAttendance,
          status,
          notes: notes || existingAttendance.notes
        });
      } else {
        // Create new record
        const [attendanceId] = await trx('class_attendances').insert({
          class_id,
          student_id,
          status,
          notes
        });

        attendanceRecords.push({
          id: attendanceId,
          class_id,
          student_id,
          status,
          notes
        });
      }

      // Handle leave credits for excused absences
      if (status === 'excused') {
        const enrollment = await trx('enrollments')
          .where('student_id', student_id)
          .where('course_group_id', classInfo.course_group_id)
          .where('status', 'active')
          .first();

        if (enrollment && enrollment.used_leaves < enrollment.leave_credits) {
          await trx('enrollments')
            .where('id', enrollment.id)
            .increment('used_leaves', 1);
        }
      }
    }

    // Update class status if all attendances are marked
    if (attendances.length === enrolledStudents.length) {
      await trx('classes')
        .where('id', class_id)
        .update({ status: 'completed' });
    }

    await trx.commit();

    res.json({
      success: true,
      message: 'Attendance marked successfully',
      data: attendanceRecords
    });

  } catch (error) {
    await trx.rollback();
    throw error;
  }
});

// @desc    Get attendance for a class
// @route   GET /api/v1/attendance/class/:classId
// @access  Private
const getClassAttendance = asyncHandler(async (req, res) => {
  const { classId } = req.params;

  // Verify class exists and user has access
  const classInfo = await db('classes')
    .join('course_groups', 'classes.course_group_id', 'course_groups.id')
    .join('courses', 'course_groups.course_id', 'courses.id')
    .select('classes.*', 'courses.branch_id', 'courses.name as course_name')
    .where('classes.id', classId)
    .first();

  if (!classInfo) {
    return res.status(404).json({
      success: false,
      message: 'Class not found'
    });
  }

  // Check branch permissions
  if (req.user.role !== 'owner' && classInfo.branch_id !== req.user.branch_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Get attendance records with student information
  const attendanceRecords = await db('class_attendances')
    .join('students', 'class_attendances.student_id', 'students.id')
    .join('users', 'students.user_id', 'users.id')
    .select(
      'class_attendances.*',
      'students.student_id as student_number',
      'users.first_name',
      'users.last_name'
    )
    .where('class_attendances.class_id', classId)
    .orderBy('users.first_name');

  // Get all enrolled students to show who hasn't been marked
  const enrolledStudents = await db('enrollments')
    .join('students', 'enrollments.student_id', 'students.id')
    .join('users', 'students.user_id', 'users.id')
    .select(
      'students.id',
      'students.student_id as student_number',
      'users.first_name',
      'users.last_name'
    )
    .where('enrollments.course_group_id', classInfo.course_group_id)
    .where('enrollments.status', 'active')
    .orderBy('users.first_name');

  // Mark which students have attendance recorded
  const markedStudentIds = new Set(attendanceRecords.map(att => att.student_id));
  const studentsWithAttendance = enrolledStudents.map(student => {
    const attendance = attendanceRecords.find(att => att.student_id === student.id);
    return {
      ...student,
      attendance_status: attendance ? attendance.status : null,
      attendance_notes: attendance ? attendance.notes : null,
      attendance_marked: markedStudentIds.has(student.id)
    };
  });

  res.json({
    success: true,
    data: {
      class_info: classInfo,
      students: studentsWithAttendance,
      summary: {
        total_students: enrolledStudents.length,
        marked_attendance: attendanceRecords.length,
        present: attendanceRecords.filter(att => att.status === 'present').length,
        absent: attendanceRecords.filter(att => att.status === 'absent').length,
        excused: attendanceRecords.filter(att => att.status === 'excused').length,
        late: attendanceRecords.filter(att => att.status === 'late').length
      }
    }
  });
});

// @desc    Get attendance report for a student
// @route   GET /api/v1/attendance/student/:studentId
// @access  Private
const getStudentAttendance = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { course_group_id, start_date, end_date } = req.query;

  // Verify student exists and user has access
  const student = await db('students')
    .join('users', 'students.user_id', 'users.id')
    .select('students.*', 'users.first_name', 'users.last_name', 'users.branch_id')
    .where('students.id', studentId)
    .first();

  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Student not found'
    });
  }

  // Check permissions
  const isOwner = req.user.role === 'owner';
  const isSameStudent = req.user.role === 'student' && req.user.id === student.user_id;
  const isSameBranch = req.user.branch_id === student.branch_id;

  if (!isOwner && !isSameStudent && !isSameBranch) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Build query for attendance records
  let query = db('class_attendances')
    .join('classes', 'class_attendances.class_id', 'classes.id')
    .join('course_groups', 'classes.course_group_id', 'course_groups.id')
    .join('courses', 'course_groups.course_id', 'courses.id')
    .join('teachers', 'classes.teacher_id', 'teachers.id')
    .join('users as teacher_users', 'teachers.user_id', 'teacher_users.id')
    .join('rooms', 'classes.room_id', 'rooms.id')
    .select(
      'class_attendances.*',
      'classes.class_date',
      'classes.start_time',
      'classes.end_time',
      'courses.name as course_name',
      'course_groups.group_name',
      'teacher_users.first_name as teacher_first_name',
      'teacher_users.last_name as teacher_last_name',
      'rooms.room_name'
    )
    .where('class_attendances.student_id', studentId);

  // Apply filters
  if (course_group_id) {
    query = query.where('classes.course_group_id', course_group_id);
  }
  if (start_date) {
    query = query.where('classes.class_date', '>=', start_date);
  }
  if (end_date) {
    query = query.where('classes.class_date', '<=', end_date);
  }

  const attendanceRecords = await query.orderBy('classes.class_date', 'desc');

  // Calculate summary statistics
  const summary = {
    total_classes: attendanceRecords.length,
    present: attendanceRecords.filter(att => att.status === 'present').length,
    absent: attendanceRecords.filter(att => att.status === 'absent').length,
    excused: attendanceRecords.filter(att => att.status === 'excused').length,
    late: attendanceRecords.filter(att => att.status === 'late').length
  };

  summary.attendance_rate = summary.total_classes > 0 
    ? ((summary.present + summary.late) / summary.total_classes * 100).toFixed(2)
    : 0;

  res.json({
    success: true,
    data: {
      student_info: student,
      attendance_records: attendanceRecords,
      summary
    }
  });
});

// @desc    Submit leave request
// @route   POST /api/v1/attendance/leave-request
// @access  Private (Student)
const submitLeaveRequest = asyncHandler(async (req, res) => {
  const { class_id, reason } = req.body;

  // Only students can submit leave requests
  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'Only students can submit leave requests'
    });
  }

  // Get student information
  const student = await db('students')
    .where('user_id', req.user.id)
    .first();

  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Student profile not found'
    });
  }

  // Verify class exists and student is enrolled
  const classInfo = await db('classes')
    .join('course_groups', 'classes.course_group_id', 'course_groups.id')
    .join('enrollments', function() {
      this.on('enrollments.course_group_id', '=', 'course_groups.id')
        .andOn('enrollments.student_id', '=', student.id);
    })
    .select('classes.*', 'enrollments.id as enrollment_id')
    .where('classes.id', class_id)
    .where('enrollments.status', 'active')
    .first();

  if (!classInfo) {
    return res.status(400).json({
      success: false,
      message: 'Class not found or you are not enrolled in this course'
    });
  }

  // Check if class is in the future
  const classDateTime = new Date(`${classInfo.class_date} ${classInfo.start_time}`);
  const now = new Date();
  
  if (classDateTime <= now) {
    return res.status(400).json({
      success: false,
      message: 'Cannot request leave for past or current classes'
    });
  }

  // Check if leave request already exists
  const existingRequest = await db('student_leaves')
    .where('student_id', student.id)
    .where('class_id', class_id)
    .first();

  if (existingRequest) {
    return res.status(400).json({
      success: false,
      message: 'Leave request already exists for this class'
    });
  }

  // Create leave request
  const [leaveRequestId] = await db('student_leaves').insert({
    student_id: student.id,
    class_id,
    reason,
    requested_at: new Date(),
    status: 'pending'
  });

  // Get the created leave request with class information
  const leaveRequest = await db('student_leaves')
    .join('classes', 'student_leaves.class_id', 'classes.id')
    .join('course_groups', 'classes.course_group_id', 'course_groups.id')
    .join('courses', 'course_groups.course_id', 'courses.id')
    .select(
      'student_leaves.*',
      'classes.class_date',
      'classes.start_time',
      'courses.name as course_name',
      'course_groups.group_name'
    )
    .where('student_leaves.id', leaveRequestId)
    .first();

  res.status(201).json({
    success: true,
    message: 'Leave request submitted successfully',
    data: leaveRequest
  });
});

// @desc    Approve/reject leave request
// @route   PUT /api/v1/attendance/leave-request/:id
// @access  Private (Admin, Owner)
const processLeaveRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, admin_notes } = req.body;

  // Only admin and owner can process leave requests
  if (!['admin', 'owner'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or Owner role required.'
    });
  }

  // Get leave request with class and branch information
  const leaveRequest = await db('student_leaves')
    .join('classes', 'student_leaves.class_id', 'classes.id')
    .join('course_groups', 'classes.course_group_id', 'course_groups.id')
    .join('courses', 'course_groups.course_id', 'courses.id')
    .select('student_leaves.*', 'courses.branch_id')
    .where('student_leaves.id', id)
    .first();

  if (!leaveRequest) {
    return res.status(404).json({
      success: false,
      message: 'Leave request not found'
    });
  }

  // Check branch permissions
  if (req.user.role !== 'owner' && leaveRequest.branch_id !== req.user.branch_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Cannot process requests from other branches.'
    });
  }

  // Update leave request
  await db('student_leaves')
    .where('id', id)
    .update({
      status,
      admin_notes,
      approved_by: req.user.id,
      approved_at: new Date()
    });

  // If approved, mark attendance as excused
  if (status === 'approved') {
    // Check if attendance record exists
    const existingAttendance = await db('class_attendances')
      .where('class_id', leaveRequest.class_id)
      .where('student_id', leaveRequest.student_id)
      .first();

    if (existingAttendance) {
      // Update existing attendance
      await db('class_attendances')
        .where('class_id', leaveRequest.class_id)
        .where('student_id', leaveRequest.student_id)
        .update({ status: 'excused' });
    } else {
      // Create new attendance record
      await db('class_attendances').insert({
        class_id: leaveRequest.class_id,
        student_id: leaveRequest.student_id,
        status: 'excused'
      });
    }
  }

  // Get updated leave request
  const updatedRequest = await db('student_leaves')
    .join('classes', 'student_leaves.class_id', 'classes.id')
    .join('course_groups', 'classes.course_group_id', 'course_groups.id')
    .join('courses', 'course_groups.course_id', 'courses.id')
    .join('users as approved_user', 'student_leaves.approved_by', 'approved_user.id')
    .select(
      'student_leaves.*',
      'classes.class_date',
      'classes.start_time',
      'courses.name as course_name',
      'course_groups.group_name',
      'approved_user.first_name as approved_by_first_name',
      'approved_user.last_name as approved_by_last_name'
    )
    .where('student_leaves.id', id)
    .first();

  res.json({
    success: true,
    message: `Leave request ${status} successfully`,
    data: updatedRequest
  });
});

// @desc    Get leave requests
// @route   GET /api/v1/attendance/leave-requests
// @access  Private
const getLeaveRequests = asyncHandler(async (req, res) => {
  const { status, student_id, page = 1, limit = 10 } = req.query;

  let query = db('student_leaves')
    .join('students', 'student_leaves.student_id', 'students.id')
    .join('users as student_users', 'students.user_id', 'student_users.id')
    .join('classes', 'student_leaves.class_id', 'classes.id')
    .join('course_groups', 'classes.course_group_id', 'course_groups.id')
    .join('courses', 'course_groups.course_id', 'courses.id')
    .leftJoin('users as approved_users', 'student_leaves.approved_by', 'approved_users.id')
    .select(
      'student_leaves.*',
      'students.student_id as student_number',
      'student_users.first_name as student_first_name',
      'student_users.last_name as student_last_name',
      'classes.class_date',
      'classes.start_time',
      'courses.name as course_name',
      'course_groups.group_name',
      'approved_users.first_name as approved_by_first_name',
      'approved_users.last_name as approved_by_last_name'
    );

  // Apply role-based filters
  if (req.user.role === 'student') {
    const student = await db('students').where('user_id', req.user.id).first();
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }
    query = query.where('student_leaves.student_id', student.id);
  } else if (req.user.role !== 'owner') {
    query = query.where('courses.branch_id', req.user.branch_id);
  }

  // Apply filters
  if (status) {
    query = query.where('student_leaves.status', status);
  }
  if (student_id) {
    query = query.where('student_leaves.student_id', student_id);
  }

  // Count total records
  const countQuery = query.clone().clearSelect().count('* as total');
  const [{ total }] = await countQuery;

  // Apply pagination
  const offset = (page - 1) * limit;
  query = query.limit(limit).offset(offset).orderBy('student_leaves.requested_at', 'desc');

  const leaveRequests = await query;

  res.json({
    success: true,
    data: leaveRequests,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      pages: Math.ceil(total / limit)
    }
  });
});

module.exports = {
  markAttendance,
  getClassAttendance,
  getStudentAttendance,
  submitLeaveRequest,
  processLeaveRequest,
  getLeaveRequests
};