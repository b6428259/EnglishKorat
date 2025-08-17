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
  .select(
    'teachers.*',           // assume teachers has first_name/last_name
    'users.branch_id'
  )
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
  .select(
    'students.*',                 // has first_name / last_name
    'users.branch_id'             // keep branch for permissions
  )
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
  .join('enrollments', function () {
    this.on('enrollments.course_group_id', '=', 'course_groups.id')
      .andOn('enrollments.student_id', '=', db.raw('?', [studentId]));
  })
  .join('teachers', 'classes.teacher_id', 'teachers.id')
  // removed join to users as teacher_users for names (users table has no names)
  .join('rooms', 'classes.room_id', 'rooms.id')
  .leftJoin('class_attendances', function () {
    this.on('class_attendances.class_id', '=', 'classes.id')
      .andOn('class_attendances.student_id', '=', db.raw('?', [studentId]));
  })
  .select(
    'classes.*',
    'courses.name as course_name',
    'course_groups.group_name',
    'teachers.first_name as teacher_first_name',
    'teachers.last_name as teacher_last_name',
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
  // removed users alias; users has no names
  .select(
    'classes.*',
    'courses.name as course_name',
    'course_groups.group_name',
    'teachers.first_name as teacher_first_name',
    'teachers.last_name as teacher_last_name'
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

  // --- AuthZ guard (defense in depth; router already checks) ---
  if (!['admin', 'owner'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or Owner role required.'
    });
  }

  // If not owner, can only query own branch (when a branch filter is provided)
  if (req.user.role !== 'owner' && branch_id && String(req.user.branch_id) !== String(branch_id)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Cannot access other branches.'
    });
  }

  // --- Validation ---
  if (!class_date) {
    return res.status(400).json({
      success: false,
      message: 'class_date is required (YYYY-MM-DD)'
    });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(class_date)) {
    return res.status(400).json({
      success: false,
      message: 'class_date must be in YYYY-MM-DD format'
    });
  }

  const slotDuration = Number(duration_hours);
  if (!Number.isFinite(slotDuration) || slotDuration <= 0) {
    return res.status(400).json({
      success: false,
      message: 'duration_hours must be a positive number'
    });
  }

  // --- Helpers (work with time strings; avoid Date/zone pitfalls) ---
  const toMinutes = (hhmmss) => {
    const [h, m, s = '0'] = hhmmss.split(':').map(Number);
    return h * 60 + m + Math.floor(s / 60);
  };
  const toHHMMSS = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:00`;
  };
  const overlaps = (aStart, aEnd, bStart, bEnd) =>
    toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);

  // Business hours and grid step
  const BUSINESS_START = '08:00:00';
  const BUSINESS_END   = '21:00:00';
  const STEP_MINUTES = 30;

  // --- Generate candidate slots ---
  const startMin = toMinutes(BUSINESS_START);
  const endMin = toMinutes(BUSINESS_END);
  const durMin = Math.round(slotDuration * 60);

  const timeSlots = [];
  for (let t = startMin; t + durMin <= endMin; t += STEP_MINUTES) {
    const start = toHHMMSS(t);
    const end = toHHMMSS(t + durMin);
    timeSlots.push({ start_time: start, end_time: end });
  }

  // --- Fetch existing classes for that date (and filters) ---
  // We only need minimal fields to evaluate conflicts
  let classQ = db('classes')
    .join('course_groups', 'classes.course_group_id', 'course_groups.id')
    .join('courses', 'course_groups.course_id', 'courses.id')
    .select('classes.id', 'classes.room_id', 'classes.teacher_id', 'classes.start_time', 'classes.end_time')
    .where('classes.class_date', class_date)
    .where('classes.status', '!=', 'cancelled');

  if (branch_id) classQ = classQ.where('courses.branch_id', branch_id);
  if (teacher_id) classQ = classQ.where('classes.teacher_id', teacher_id);
  if (room_id) classQ = classQ.where('classes.room_id', room_id);

  const existingClasses = await classQ;

  // --- Fetch available rooms ---
  let roomQ = db('rooms').select('id', 'room_name', 'branch_id', 'status').where('status', 'available');
  if (branch_id) roomQ = roomQ.where('branch_id', branch_id);
  if (room_id) roomQ = roomQ.where('id', room_id);
  const availableRooms = await roomQ;

  // --- Fetch available teachers ---
  let teacherQ = db('teachers')
    .join('users', 'teachers.user_id', 'users.id')
    .select('teachers.id', 'teachers.first_name', 'teachers.last_name', 'users.branch_id', 'teachers.is_active')
    .where('teachers.is_active', true);
  if (branch_id) teacherQ = teacherQ.where('users.branch_id', branch_id);
  if (teacher_id) teacherQ = teacherQ.where('teachers.id', teacher_id);
  const availableTeachers = await teacherQ;

  // Short-circuit if no rooms/teachers are available at all
  if (availableRooms.length === 0 || availableTeachers.length === 0) {
    return res.json({
      success: true,
      data: {
        date: class_date,
        duration_hours: slotDuration,
        available_slots: [],
        summary: {
          total_possible_slots: timeSlots.length,
          available_slots: 0,
          occupied_slots: timeSlots.length
        }
      }
    });
  }

  // --- Build availability per slot ---
  const availableSlots = timeSlots.map((slot) => {
    // classes overlapping this slot
    const slotConflicts = existingClasses.filter((c) =>
      overlaps(slot.start_time, slot.end_time, c.start_time, c.end_time)
    );

    // remove rooms/teachers that are already booked in conflicts
    const busyRoomIds = new Set(slotConflicts.map((c) => c.room_id));
    const busyTeacherIds = new Set(slotConflicts.map((c) => c.teacher_id));

    const roomsForSlot = availableRooms.filter((r) => !busyRoomIds.has(r.id));
    const teachersForSlot = availableTeachers.filter((t) => !busyTeacherIds.has(t.id));

    return {
      start_time: slot.start_time,
      end_time: slot.end_time,
      available_rooms: roomsForSlot,
      available_teachers: teachersForSlot
    };
  }).filter(s => s.available_rooms.length > 0 && s.available_teachers.length > 0);

  // --- Response ---
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
  .join('rooms', 'classes.room_id', 'rooms.id')
  .select(
    'classes.*',
    'courses.name as course_name',
    'course_groups.group_name',
    'teachers.first_name as teacher_first_name',
    'teachers.last_name as teacher_last_name',
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