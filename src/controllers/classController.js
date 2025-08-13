const { db } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Create a new class
// @route   POST /api/v1/classes
// @access  Private (Admin, Owner)
const createClass = asyncHandler(async (req, res) => {
  const {
    course_group_id,
    teacher_id,
    room_id,
    class_date,
    start_time,
    end_time,
    hours,
    notes
  } = req.body;

  // Verify course group exists and user has access
  const courseGroup = await db('course_groups')
    .join('courses', 'course_groups.course_id', 'courses.id')
    .select('course_groups.*', 'courses.branch_id')
    .where('course_groups.id', course_group_id)
    .first();

  if (!courseGroup) {
    return res.status(404).json({
      success: false,
      message: 'Course group not found'
    });
  }

  // Check branch permissions
  if (req.user.role !== 'owner' && courseGroup.branch_id !== req.user.branch_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Cannot create classes for other branches.'
    });
  }

  // Verify teacher exists and is available
  const teacher = await db('teachers')
    .join('users', 'teachers.user_id', 'users.id')
    .select('teachers.*', 'users.branch_id')
    .where('teachers.id', teacher_id)
    .first();

  if (!teacher) {
    return res.status(404).json({
      success: false,
      message: 'Teacher not found'
    });
  }

  // Verify room exists and is available
  const room = await db('rooms')
    .where('id', room_id)
    .where('status', 'available')
    .first();

  if (!room) {
    return res.status(404).json({
      success: false,
      message: 'Room not found or unavailable'
    });
  }

  // Check for scheduling conflicts
  const conflictingClass = await db('classes')
    .where('room_id', room_id)
    .where('class_date', class_date)
    .where('status', '!=', 'cancelled')
    .where(function() {
      this.where(function() {
        this.where('start_time', '<=', start_time)
          .where('end_time', '>', start_time);
      }).orWhere(function() {
        this.where('start_time', '<', end_time)
          .where('end_time', '>=', end_time);
      }).orWhere(function() {
        this.where('start_time', '>=', start_time)
          .where('end_time', '<=', end_time);
      });
    })
    .first();

  if (conflictingClass) {
    return res.status(400).json({
      success: false,
      message: 'Room is not available at the specified time'
    });
  }

  // Check teacher availability
  const teacherConflict = await db('classes')
    .where('teacher_id', teacher_id)
    .where('class_date', class_date)
    .where('status', '!=', 'cancelled')
    .where(function() {
      this.where(function() {
        this.where('start_time', '<=', start_time)
          .where('end_time', '>', start_time);
      }).orWhere(function() {
        this.where('start_time', '<', end_time)
          .where('end_time', '>=', end_time);
      }).orWhere(function() {
        this.where('start_time', '>=', start_time)
          .where('end_time', '<=', end_time);
      });
    })
    .first();

  if (teacherConflict) {
    return res.status(400).json({
      success: false,
      message: 'Teacher is not available at the specified time'
    });
  }

  // Create the class
  const [classId] = await db('classes').insert({
    course_group_id,
    teacher_id,
    room_id,
    class_date,
    start_time,
    end_time,
    hours,
    notes,
    status: 'scheduled'
  });

  // Get the created class with related information
  const newClass = await db('classes')
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
    .where('classes.id', classId)
    .first();

  res.status(201).json({
    success: true,
    message: 'Class created successfully',
    data: newClass
  });
});

// @desc    Get classes with filters
// @route   GET /api/v1/classes
// @access  Private
const getClasses = asyncHandler(async (req, res) => {
  const {
    course_group_id,
    teacher_id,
    room_id,
    class_date,
    status,
    page = 1,
    limit = 10
  } = req.query;

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
    );

  // Apply branch filter for non-owners
  if (req.user.role !== 'owner') {
    query = query.where('courses.branch_id', req.user.branch_id);
  }

  // Apply filters
  if (course_group_id) {
    query = query.where('classes.course_group_id', course_group_id);
  }
  if (teacher_id) {
    query = query.where('classes.teacher_id', teacher_id);
  }
  if (room_id) {
    query = query.where('classes.room_id', room_id);
  }
  if (class_date) {
    query = query.where('classes.class_date', class_date);
  }
  if (status) {
    query = query.where('classes.status', status);
  }

  // Count total records
  const countQuery = query.clone().clearSelect().count('* as total');
  const [{ total }] = await countQuery;

  // Apply pagination
  const offset = (page - 1) * limit;
  query = query.limit(limit).offset(offset).orderBy('classes.class_date', 'asc').orderBy('classes.start_time', 'asc');

  const classes = await query;

  res.json({
    success: true,
    data: classes,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      pages: Math.ceil(total / limit)
    }
  });
});

// @desc    Get single class by ID
// @route   GET /api/v1/classes/:id
// @access  Private
const getClassById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const classInfo = await db('classes')
    .join('course_groups', 'classes.course_group_id', 'course_groups.id')
    .join('courses', 'course_groups.course_id', 'courses.id')
    .join('teachers', 'classes.teacher_id', 'teachers.id')
    .join('users as teacher_users', 'teachers.user_id', 'teacher_users.id')
    .join('rooms', 'classes.room_id', 'rooms.id')
    .select(
      'classes.*',
      'courses.name as course_name',
      'courses.branch_id',
      'course_groups.group_name',
      'teacher_users.first_name as teacher_first_name',
      'teacher_users.last_name as teacher_last_name',
      'rooms.room_name'
    )
    .where('classes.id', id)
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

  res.json({
    success: true,
    data: classInfo
  });
});

// @desc    Update class
// @route   PUT /api/v1/classes/:id
// @access  Private (Admin, Owner)
const updateClass = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    teacher_id,
    room_id,
    class_date,
    start_time,
    end_time,
    hours,
    status,
    notes
  } = req.body;

  // Get current class info
  const currentClass = await db('classes')
    .join('course_groups', 'classes.course_group_id', 'course_groups.id')
    .join('courses', 'course_groups.course_id', 'courses.id')
    .select('classes.*', 'courses.branch_id')
    .where('classes.id', id)
    .first();

  if (!currentClass) {
    return res.status(404).json({
      success: false,
      message: 'Class not found'
    });
  }

  // Check permissions
  if (req.user.role !== 'owner' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or Owner role required.'
    });
  }

  // Check branch permissions
  if (req.user.role !== 'owner' && currentClass.branch_id !== req.user.branch_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Cannot update classes from other branches.'
    });
  }

  const updateData = {};

  // Update fields if provided
  if (teacher_id !== undefined) updateData.teacher_id = teacher_id;
  if (room_id !== undefined) updateData.room_id = room_id;
  if (class_date !== undefined) updateData.class_date = class_date;
  if (start_time !== undefined) updateData.start_time = start_time;
  if (end_time !== undefined) updateData.end_time = end_time;
  if (hours !== undefined) updateData.hours = hours;
  if (status !== undefined) updateData.status = status;
  if (notes !== undefined) updateData.notes = notes;

  // Check for conflicts if time/date/room/teacher changed
  if (teacher_id || room_id || class_date || start_time || end_time) {
    const checkConflicts = async (fieldName, fieldValue) => {
      const conflictingClass = await db('classes')
        .where(fieldName, fieldValue)
        .where('class_date', class_date || currentClass.class_date)
        .where('status', '!=', 'cancelled')
        .where('id', '!=', id)
        .where(function() {
          this.where(function() {
            this.where('start_time', '<=', start_time || currentClass.start_time)
              .where('end_time', '>', start_time || currentClass.start_time);
          }).orWhere(function() {
            this.where('start_time', '<', end_time || currentClass.end_time)
              .where('end_time', '>=', end_time || currentClass.end_time);
          });
        })
        .first();

      return conflictingClass;
    };

    if (room_id || class_date || start_time || end_time) {
      const roomConflict = await checkConflicts('room_id', room_id || currentClass.room_id);
      if (roomConflict) {
        return res.status(400).json({
          success: false,
          message: 'Room is not available at the specified time'
        });
      }
    }

    if (teacher_id || class_date || start_time || end_time) {
      const teacherConflict = await checkConflicts('teacher_id', teacher_id || currentClass.teacher_id);
      if (teacherConflict) {
        return res.status(400).json({
          success: false,
          message: 'Teacher is not available at the specified time'
        });
      }
    }
  }

  // Update the class
  await db('classes')
    .where('id', id)
    .update(updateData);

  // Get updated class info
  const updatedClass = await db('classes')
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
    .where('classes.id', id)
    .first();

  res.json({
    success: true,
    message: 'Class updated successfully',
    data: updatedClass
  });
});

// @desc    Delete class
// @route   DELETE /api/v1/classes/:id
// @access  Private (Admin, Owner)
const deleteClass = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get class info first
  const classInfo = await db('classes')
    .join('course_groups', 'classes.course_group_id', 'course_groups.id')
    .join('courses', 'course_groups.course_id', 'courses.id')
    .select('classes.*', 'courses.branch_id')
    .where('classes.id', id)
    .first();

  if (!classInfo) {
    return res.status(404).json({
      success: false,
      message: 'Class not found'
    });
  }

  // Check permissions
  if (req.user.role !== 'owner' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or Owner role required.'
    });
  }

  // Check branch permissions
  if (req.user.role !== 'owner' && classInfo.branch_id !== req.user.branch_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Cannot delete classes from other branches.'
    });
  }

  // Check if class has already started or completed
  if (['in_progress', 'completed'].includes(classInfo.status)) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete classes that are in progress or completed'
    });
  }

  // Delete the class (this will cascade delete attendances)
  await db('classes').where('id', id).del();

  res.json({
    success: true,
    message: 'Class deleted successfully'
  });
});

module.exports = {
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deleteClass
};