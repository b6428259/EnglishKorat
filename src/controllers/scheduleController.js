const { db } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get schedule for a teacher
// @route   GET /api/v1/schedules/teacher/:teacherId
// @access  Private
const getTeacherSchedule = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;
  const { start_date, end_date, status } = req.query;

  // Verify teacher exists and user has access
  const teacher = await db('teachers')
    .join('users', 'teachers.user_id', 'users.id')
    .select('teachers.*', 'users.first_name', 'users.last_name', 'users.branch_id')
    .where('teachers.id', teacherId)
    .first();

  if (!teacher) {
    return res.status(404).json({
      success: false,
      message: 'Teacher not found'
    });
  }

  // Check permissions
  const isOwner = req.user.role === 'owner';
  const isSameTeacher = req.user.role === 'teacher' && req.user.id === teacher.user_id;
  const isSameBranch = req.user.branch_id === teacher.branch_id;

  if (!isOwner && !isSameTeacher && !isSameBranch) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Build query for teacher's classes
  let query = db('classes')
    .join('course_groups', 'classes.course_group_id', 'course_groups.id')
    .join('courses', 'course_groups.course_id', 'courses.id')
    .join('rooms', 'classes.room_id', 'rooms.id')
    .select(
      'classes.*',
      'courses.name as course_name',
      'course_groups.group_name',
      'rooms.room_name'
    )
    .where('classes.teacher_id', teacherId);

  // Apply filters
  if (start_date) {
    query = query.where('classes.class_date', '>=', start_date);
  }
  if (end_date) {
    query = query.where('classes.class_date', '<=', end_date);
  }
  if (status) {
    query = query.where('classes.status', status);
  }

  const classes = await query.orderBy('classes.class_date', 'asc').orderBy('classes.start_time', 'asc');

  // Get student counts for each class
  const classIds = classes.map(c => c.id);
  let studentCounts = {};
  
  if (classIds.length > 0) {
    const enrollmentCounts = await db('enrollments')
      .join('classes', 'enrollments.course_group_id', 'classes.course_group_id')
      .select('classes.id as class_id')
      .count('enrollments.id as student_count')
      .whereIn('classes.id', classIds)
      .where('enrollments.status', 'active')
      .groupBy('classes.id');

    studentCounts = enrollmentCounts.reduce((acc, item) => {
      acc[item.class_id] = item.student_count;
      return acc;
    }, {});
  }

  // Add student count to each class
  const classesWithStudentCount = classes.map(classItem => ({
    ...classItem,
    student_count: studentCounts[classItem.id] || 0
  }));

  res.json({
    success: true,
    data: {
      teacher_info: teacher,
      classes: classesWithStudentCount
    }
  });
});

// @desc    Get schedule for a student
// @route   GET /api/v1/schedules/student/:studentId
// @access  Private
const getStudentSchedule = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { start_date, end_date, status } = req.query;

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

  // Get student's enrolled courses and their classes
  let query = db('classes')
    .join('course_groups', 'classes.course_group_id', 'course_groups.id')
    .join('courses', 'course_groups.course_id', 'courses.id')
    .join('enrollments', function() {
      this.on('enrollments.course_group_id', '=', 'course_groups.id')
        .andOn('enrollments.student_id', '=', studentId);
    })
    .join('teachers', 'classes.teacher_id', 'teachers.id')
    .join('users as teacher_users', 'teachers.user_id', 'teacher_users.id')
    .join('rooms', 'classes.room_id', 'rooms.id')
    .leftJoin('class_attendances', function() {
      this.on('class_attendances.class_id', '=', 'classes.id')
        .andOn('class_attendances.student_id', '=', studentId);
    })
    .select(
      'classes.*',
      'courses.name as course_name',
      'course_groups.group_name',
      'teacher_users.first_name as teacher_first_name',
      'teacher_users.last_name as teacher_last_name',
      'rooms.room_name',
      'class_attendances.status as attendance_status',
      'enrollments.status as enrollment_status'
    )
    .where('enrollments.status', 'active');

  // Apply filters
  if (start_date) {
    query = query.where('classes.class_date', '>=', start_date);
  }
  if (end_date) {
    query = query.where('classes.class_date', '<=', end_date);
  }
  if (status) {
    query = query.where('classes.status', status);
  }

  const classes = await query.orderBy('classes.class_date', 'asc').orderBy('classes.start_time', 'asc');

  res.json({
    success: true,
    data: {
      student_info: student,
      classes: classes
    }
  });
});

// @desc    Get room schedule
// @route   GET /api/v1/schedules/room/:roomId
// @access  Private
const getRoomSchedule = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { start_date, end_date, status } = req.query;

  // Verify room exists and user has access
  const room = await db('rooms')
    .join('branches', 'rooms.branch_id', 'branches.id')
    .select('rooms.*', 'branches.name as branch_name', 'branches.id as branch_id')
    .where('rooms.id', roomId)
    .first();

  if (!room) {
    return res.status(404).json({
      success: false,
      message: 'Room not found'
    });
  }

  // Check branch permissions
  if (req.user.role !== 'owner' && room.branch_id !== req.user.branch_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Build query for room's classes
  let query = db('classes')
    .join('course_groups', 'classes.course_group_id', 'course_groups.id')
    .join('courses', 'course_groups.course_id', 'courses.id')
    .join('teachers', 'classes.teacher_id', 'teachers.id')
    .join('users as teacher_users', 'teachers.user_id', 'teacher_users.id')
    .select(
      'classes.*',
      'courses.name as course_name',
      'course_groups.group_name',
      'teacher_users.first_name as teacher_first_name',
      'teacher_users.last_name as teacher_last_name'
    )
    .where('classes.room_id', roomId);

  // Apply filters
  if (start_date) {
    query = query.where('classes.class_date', '>=', start_date);
  }
  if (end_date) {
    query = query.where('classes.class_date', '<=', end_date);
  }
  if (status) {
    query = query.where('classes.status', status);
  }

  const classes = await query.orderBy('classes.class_date', 'asc').orderBy('classes.start_time', 'asc');

  res.json({
    success: true,
    data: {
      room_info: room,
      classes: classes
    }
  });
});

// @desc    Check for scheduling conflicts
// @route   POST /api/v1/schedules/check-conflicts
// @access  Private (Admin, Owner)
const checkSchedulingConflicts = asyncHandler(async (req, res) => {
  const {
    teacher_id,
    room_id,
    class_date,
    start_time,
    end_time,
    exclude_class_id
  } = req.body;

  // Only admin and owner can check conflicts
  if (!['admin', 'owner'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or Owner role required.'
    });
  }

  const conflicts = [];

  // Check teacher conflicts
  if (teacher_id) {
    let teacherQuery = db('classes')
      .join('course_groups', 'classes.course_group_id', 'course_groups.id')
      .join('courses', 'course_groups.course_id', 'courses.id')
      .join('rooms', 'classes.room_id', 'rooms.id')
      .select(
        'classes.*',
        'courses.name as course_name',
        'course_groups.group_name',
        'rooms.room_name'
      )
      .where('classes.teacher_id', teacher_id)
      .where('classes.class_date', class_date)
      .where('classes.status', '!=', 'cancelled')
      .where(function() {
        this.where(function() {
          this.where('classes.start_time', '<=', start_time)
            .where('classes.end_time', '>', start_time);
        }).orWhere(function() {
          this.where('classes.start_time', '<', end_time)
            .where('classes.end_time', '>=', end_time);
        }).orWhere(function() {
          this.where('classes.start_time', '>=', start_time)
            .where('classes.end_time', '<=', end_time);
        });
      });

    if (exclude_class_id) {
      teacherQuery = teacherQuery.where('classes.id', '!=', exclude_class_id);
    }

    const teacherConflicts = await teacherQuery;
    if (teacherConflicts.length > 0) {
      conflicts.push({
        type: 'teacher',
        message: 'Teacher has conflicting classes',
        conflicts: teacherConflicts
      });
    }
  }

  // Check room conflicts
  if (room_id) {
    let roomQuery = db('classes')
      .join('course_groups', 'classes.course_group_id', 'course_groups.id')
      .join('courses', 'course_groups.course_id', 'courses.id')
      .join('teachers', 'classes.teacher_id', 'teachers.id')
      .join('users as teacher_users', 'teachers.user_id', 'teacher_users.id')
      .select(
        'classes.*',
        'courses.name as course_name',
        'course_groups.group_name',
        'teacher_users.first_name as teacher_first_name',
        'teacher_users.last_name as teacher_last_name'
      )
      .where('classes.room_id', room_id)
      .where('classes.class_date', class_date)
      .where('classes.status', '!=', 'cancelled')
      .where(function() {
        this.where(function() {
          this.where('classes.start_time', '<=', start_time)
            .where('classes.end_time', '>', start_time);
        }).orWhere(function() {
          this.where('classes.start_time', '<', end_time)
            .where('classes.end_time', '>=', end_time);
        }).orWhere(function() {
          this.where('classes.start_time', '>=', start_time)
            .where('classes.end_time', '<=', end_time);
        });
      });

    if (exclude_class_id) {
      roomQuery = roomQuery.where('classes.id', '!=', exclude_class_id);
    }

    const roomConflicts = await roomQuery;
    if (roomConflicts.length > 0) {
      conflicts.push({
        type: 'room',
        message: 'Room has conflicting classes',
        conflicts: roomConflicts
      });
    }
  }

  res.json({
    success: true,
    has_conflicts: conflicts.length > 0,
    conflicts: conflicts
  });
});

// @desc    Get available time slots
// @route   GET /api/v1/schedules/available-slots
// @access  Private (Admin, Owner)
const getAvailableTimeSlots = asyncHandler(async (req, res) => {
  const {
    branch_id,
    class_date,
    duration_hours = 1.5,
    teacher_id,
    room_id
  } = req.query;

  // Only admin and owner can get available slots
  if (!['admin', 'owner'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or Owner role required.'
    });
  }

  // Check branch permissions
  if (req.user.role !== 'owner' && branch_id && branch_id !== req.user.branch_id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Cannot access other branches.'
    });
  }

  // Define business hours (8:00 AM to 9:00 PM)
  const businessStart = '08:00:00';
  const businessEnd = '21:00:00';
  const slotDuration = parseFloat(duration_hours);

  // Generate possible time slots
  const timeSlots = [];
  let currentTime = new Date(`2023-01-01 ${businessStart}`);
  const endTime = new Date(`2023-01-01 ${businessEnd}`);

  while (currentTime < endTime) {
    const endSlot = new Date(currentTime.getTime() + (slotDuration * 60 * 60 * 1000));
    if (endSlot <= endTime) {
      timeSlots.push({
        start_time: currentTime.toTimeString().slice(0, 8),
        end_time: endSlot.toTimeString().slice(0, 8)
      });
    }
    currentTime = new Date(currentTime.getTime() + (30 * 60 * 1000)); // 30-minute intervals
  }

  // Get existing classes for the date
  let query = db('classes')
    .join('course_groups', 'classes.course_group_id', 'course_groups.id')
    .join('courses', 'course_groups.course_id', 'courses.id')
    .select('classes.*')
    .where('classes.class_date', class_date)
    .where('classes.status', '!=', 'cancelled');

  if (branch_id) {
    query = query.where('courses.branch_id', branch_id);
  }
  if (teacher_id) {
    query = query.where('classes.teacher_id', teacher_id);
  }

  const existingClasses = await query;

  // Get available rooms
  let roomQuery = db('rooms')
    .select('*')
    .where('status', 'available');

  if (branch_id) {
    roomQuery = roomQuery.where('branch_id', branch_id);
  }
  if (room_id) {
    roomQuery = roomQuery.where('id', room_id);
  }

  const availableRooms = await roomQuery;

  // Get available teachers
  let teacherQuery = db('teachers')
    .join('users', 'teachers.user_id', 'users.id')
    .select('teachers.*', 'users.first_name', 'users.last_name')
    .where('teachers.is_active', true);

  if (branch_id) {
    teacherQuery = teacherQuery.where('users.branch_id', branch_id);
  }
  if (teacher_id) {
    teacherQuery = teacherQuery.where('teachers.id', teacher_id);
  }

  const availableTeachers = await teacherQuery;

  // Find available slots
  const availableSlots = [];

  for (const slot of timeSlots) {
    const slotConflicts = existingClasses.filter(existingClass => {
      return (
        (slot.start_time <= existingClass.start_time && slot.end_time > existingClass.start_time) ||
        (slot.start_time < existingClass.end_time && slot.end_time >= existingClass.end_time) ||
        (slot.start_time >= existingClass.start_time && slot.end_time <= existingClass.end_time)
      );
    });

    // Check room availability
    const availableRoomsForSlot = availableRooms.filter(room => {
      return !slotConflicts.some(conflict => conflict.room_id === room.id);
    });

    // Check teacher availability
    const availableTeachersForSlot = availableTeachers.filter(teacher => {
      return !slotConflicts.some(conflict => conflict.teacher_id === teacher.id);
    });

    if (availableRoomsForSlot.length > 0 && availableTeachersForSlot.length > 0) {
      availableSlots.push({
        ...slot,
        available_rooms: availableRoomsForSlot,
        available_teachers: availableTeachersForSlot
      });
    }
  }

  res.json({
    success: true,
    data: {
      date: class_date,
      duration_hours: slotDuration,
      available_slots: availableSlots,
      summary: {
        total_possible_slots: timeSlots.length,
        available_slots: availableSlots.length,
        occupied_slots: timeSlots.length - availableSlots.length
      }
    }
  });
});

// @desc    Get branch schedule overview
// @route   GET /api/v1/schedules/branch/:branchId
// @access  Private (Admin, Owner)
const getBranchSchedule = asyncHandler(async (req, res) => {
  const { branchId } = req.params;
  const { start_date, end_date } = req.query;

  // Check permissions
  if (req.user.role !== 'owner' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or Owner role required.'
    });
  }

  // Check branch permissions
  if (req.user.role !== 'owner' && req.user.branch_id !== parseInt(branchId)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Cannot access other branches.'
    });
  }

  // Verify branch exists
  const branch = await db('branches')
    .where('id', branchId)
    .first();

  if (!branch) {
    return res.status(404).json({
      success: false,
      message: 'Branch not found'
    });
  }

  // Get branch classes
  let query = db('classes')
    .join('course_groups', 'classes.course_group_id', 'course_groups.id')
    .join('courses', 'course_groups.course_id', 'courses.id')
    .join('teachers', 'classes.teacher_id', 'teachers.id')
    .join('users as teacher_users', 'teachers.user_id', 'teacher_users.id')
    .join('rooms', 'classes.room_id', 'rooms.id')
    .select(
      'classes.*',
      'courses.name as course_name',
      'course_groups.group_name',
      'teacher_users.first_name as teacher_first_name',
      'teacher_users.last_name as teacher_last_name',
      'rooms.room_name'
    )
    .where('courses.branch_id', branchId);

  // Apply date filters
  if (start_date) {
    query = query.where('classes.class_date', '>=', start_date);
  }
  if (end_date) {
    query = query.where('classes.class_date', '<=', end_date);
  }

  const classes = await query.orderBy('classes.class_date', 'asc').orderBy('classes.start_time', 'asc');

  // Get summary statistics
  const summary = {
    total_classes: classes.length,
    scheduled: classes.filter(c => c.status === 'scheduled').length,
    confirmed: classes.filter(c => c.status === 'confirmed').length,
    in_progress: classes.filter(c => c.status === 'in_progress').length,
    completed: classes.filter(c => c.status === 'completed').length,
    cancelled: classes.filter(c => c.status === 'cancelled').length
  };

  res.json({
    success: true,
    data: {
      branch_info: branch,
      classes: classes,
      summary: summary
    }
  });
});

module.exports = {
  getTeacherSchedule,
  getStudentSchedule,
  getRoomSchedule,
  checkSchedulingConflicts,
  getAvailableTimeSlots,
  getBranchSchedule
};