const { db } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Create new schedule with auto-generated sessions
// @route   POST /api/v1/schedules
// @access  Private (Admin, Owner)
const createSchedule = asyncHandler(async (req, res) => {
  const {
    course_id,
    teacher_id,
    room_id,
    schedule_name,
    total_hours,
    hours_per_session = 3.0,
    max_students = 6,
    start_date,
    time_slots, // [{ day_of_week: 'wednesday', start_time: '09:00:00', end_time: '12:00:00' }, ...]
    auto_reschedule_holidays = true,
    notes
  } = req.body;

  // Validation
  if (!course_id || !schedule_name || !total_hours || !start_date || !time_slots?.length) {
    return res.status(400).json({
      success: false,
      message: 'Required fields: course_id, schedule_name, total_hours, start_date, time_slots'
    });
  }

  // Check if course exists and user has access
  const course = await db('courses')
    .join('branches', 'courses.branch_id', 'branches.id')
    .select('courses.*', 'branches.name as branch_name')
    .where('courses.id', course_id)
    .first();

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Check branch permissions
  if (req.user.role !== 'owner' && course.branch_id !== req.user.branch_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Cannot create schedule for other branches.'
    });
  }

  // Calculate schedule details
  const sessionsPerWeek = time_slots.length;
  const totalSessions = Math.ceil(total_hours / hours_per_session);
  const estimatedWeeks = Math.ceil(totalSessions / sessionsPerWeek);
  const estimatedEndDate = new Date(start_date);
  estimatedEndDate.setDate(estimatedEndDate.getDate() + (estimatedWeeks * 7));

  let scheduleId;

  try {
    await db.transaction(async (trx) => {
      // 1. Create main schedule
      const [insertedId] = await trx('schedules').insert({
        course_id,
        teacher_id: teacher_id || null,
        room_id: room_id || null,
        schedule_name,
        schedule_type: 'fixed',
        recurring_pattern: 'weekly',
        total_hours,
        hours_per_session,
        sessions_per_week: sessionsPerWeek,
        max_students,
        start_date,
        estimated_end_date: estimatedEndDate.toISOString().split('T')[0],
        status: 'active',
        auto_reschedule_holidays,
        notes: notes || null,
        admin_assigned: req.user.id
      });

      scheduleId = insertedId;

      // 2. Create time slots
      const timeSlotInserts = [];
      for (let i = 0; i < time_slots.length; i++) {
        const slot = time_slots[i];
        timeSlotInserts.push({
          schedule_id: scheduleId,
          day_of_week: slot.day_of_week,
          start_time: slot.start_time,
          end_time: slot.end_time,
          slot_order: i + 1
        });
      }
      
      await trx('schedule_time_slots').insert(timeSlotInserts);

      // 3. Get inserted time slots
      const insertedTimeSlots = await trx('schedule_time_slots')
        .where('schedule_id', scheduleId)
        .orderBy('slot_order', 'asc');

      // 4. Generate all sessions
      const sessions = await generateScheduleSessions(
        scheduleId,
        insertedTimeSlots,
        start_date,
        totalSessions,
        teacher_id,
        room_id,
        auto_reschedule_holidays
      );

      if (sessions.length > 0) {
        await trx('schedule_sessions').insert(sessions);
      }
    });

    // Get created schedule with details
    const schedule = await getScheduleWithDetails(scheduleId);

    res.status(201).json({
      success: true,
      message: `Schedule created successfully with ${totalSessions} sessions generated across ${estimatedWeeks} weeks`,
      data: { 
        schedule,
        sessions_generated: totalSessions,
        estimated_weeks: estimatedWeeks,
        sessions_per_week: sessionsPerWeek
      }
    });

  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create schedule',
      error: error.message
    });
  }
});

// Helper function to generate schedule sessions
const generateScheduleSessions = async (scheduleId, timeSlots, startDate, totalSessions, teacherId, roomId, autoRescheduleHolidays) => {
  const sessions = [];
  // คำนวณช่วงปี พ.ศ. ที่เกี่ยวข้อง
  const start = new Date(startDate);
  const years = [];
  const endEstimate = new Date(start);
  endEstimate.setDate(endEstimate.getDate() + Math.ceil(totalSessions / timeSlots.length) * 7);
  let yearBE = start.getFullYear() + 543;
  let endYearBE = endEstimate.getFullYear() + 543;
  for (let y = yearBE; y <= endYearBE; y++) years.push(y);
  const holidays = await getHolidays(years);
  let sessionNumber = 1;
  let weekNumber = 1;
  let currentWeekStart = new Date(startDate);
  
  // Find the Monday of the week containing start_date
  const daysSinceMonday = (currentWeekStart.getDay() + 6) % 7;
  currentWeekStart.setDate(currentWeekStart.getDate() - daysSinceMonday);
  
  const dayNumbers = {
    'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
    'thursday': 4, 'friday': 5, 'saturday': 6
  };

  while (sessionNumber <= totalSessions) {
    for (const timeSlot of timeSlots) {
      if (sessionNumber > totalSessions) break;

      // Calculate session date
      const targetDay = dayNumbers[timeSlot.day_of_week];
      const sessionDate = new Date(currentWeekStart);
      sessionDate.setDate(sessionDate.getDate() + targetDay);

      const dateStr = sessionDate.toISOString().split('T')[0];
      
      // Check if it's a holiday
      const isHoliday = holidays.some(h => h.date === dateStr);
      
      let status = 'scheduled';
      let notes = null;
      
      if (isHoliday) {
        const holiday = holidays.find(h => h.date === dateStr);
        if (autoRescheduleHolidays) {
          notes = `Originally scheduled on ${holiday.name} - to be rescheduled`;
          status = 'cancelled';
        } else {
          status = 'cancelled';
          notes = `Cancelled due to ${holiday.name}`;
        }
      }

      sessions.push({
        schedule_id: scheduleId,
        time_slot_id: timeSlot.id,
        session_date: dateStr,
        session_number: sessionNumber,
        week_number: weekNumber,
        start_time: timeSlot.start_time,
        end_time: timeSlot.end_time,
        teacher_id: teacherId || null,
        room_id: roomId || null,
        status,
        notes,
        is_makeup_session: false
      });

      sessionNumber++;
    }
    
    weekNumber++;
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  }

  // Add makeup sessions for cancelled holidays
  if (autoRescheduleHolidays) {
    const cancelledSessions = sessions.filter(s => s.status === 'cancelled');
    
    for (const cancelled of cancelledSessions) {
      const timeSlot = timeSlots.find(ts => ts.id === cancelled.time_slot_id);
      const targetDay = dayNumbers[timeSlot.day_of_week];
      
      // Schedule makeup session 1 week after course ends
      let makeupDate = new Date(currentWeekStart);
      makeupDate.setDate(makeupDate.getDate() + targetDay);

      sessions.push({
        schedule_id: scheduleId,
        time_slot_id: cancelled.time_slot_id,
        session_date: makeupDate.toISOString().split('T')[0],
        session_number: cancelled.session_number,
        week_number: weekNumber,
        start_time: timeSlot.start_time,
        end_time: timeSlot.end_time,
        teacher_id: teacherId || null,
        room_id: roomId || null,
        status: 'scheduled',
        is_makeup_session: true,
        notes: `Makeup session for ${cancelled.notes}`
      });
      
      weekNumber++;
    }
  }

  return sessions;
};

// Helper function to get holidays
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// ดึงวันหยุดจาก myhora.com ตามปี พ.ศ. ที่ส่งมา
const getHolidays = async (years) => {
  const allHolidays = [];
  for (const yearBE of years) {
    try {
      const url = `https://www.myhora.com/calendar/ical/holiday.aspx?${yearBE}.json`;
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const data = await resp.json();
      if (Array.isArray(data)) {
        for (const item of data) {
          // item.Date: '2568-04-13', item.Title: 'วันสงกรานต์'
          // แปลงปี พ.ศ. เป็น ค.ศ. สำหรับ date
          let [y, m, d] = item.Date.split('-');
          y = (parseInt(y, 10) - 543).toString();
          const dateISO = `${y}-${m}-${d}`;
          allHolidays.push({ date: dateISO, name: item.Title });
        }
      }
    } catch (e) {
      // ignore error
    }
  }
  return allHolidays;
};

// @desc    Get all schedules
// @route   GET /api/v1/schedules
// @access  Private
const getSchedules = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    course_id,
    teacher_id,
    room_id,
    day_of_week,
    status,
    branch_id
  } = req.query;
  const offset = (page - 1) * limit;

  let query = db('schedules')
    .join('courses', 'schedules.course_id', 'courses.id')
    .leftJoin('teachers', 'schedules.teacher_id', 'teachers.id')
    .leftJoin('rooms', 'schedules.room_id', 'rooms.id')
    .leftJoin('branches', 'courses.branch_id', 'branches.id')
    .select(
      'schedules.*',
      'courses.name as course_name',
      'courses.code as course_code',
      'teachers.first_name as teacher_first_name',
      'teachers.last_name as teacher_last_name',
      'rooms.room_name',
      'branches.name as branch_name'
    );

  // Apply filters
  if (course_id) query = query.where('schedules.course_id', course_id);
  if (teacher_id) query = query.where('schedules.teacher_id', teacher_id);
  if (room_id) query = query.where('schedules.room_id', room_id);
  if (day_of_week) query = query.where('schedules.day_of_week', day_of_week);
  if (status) query = query.where('schedules.status', status);
  if (branch_id) query = query.where('courses.branch_id', branch_id);

  // Branch permission check
  if (req.user.role !== 'owner') {
    query = query.where('courses.branch_id', req.user.branch_id);
  }

  const schedules = await query
    .orderBy('schedules.day_of_week', 'asc')
    .orderBy('schedules.start_time', 'asc')
    .limit(limit)
    .offset(offset);

  // Get student counts for each schedule
  const scheduleIds = schedules.map(s => s.id);
  let studentCounts = {};
  
  if (scheduleIds.length > 0) {
    const counts = await db('schedule_students')
      .select('schedule_id')
      .count('id as student_count')
      .whereIn('schedule_id', scheduleIds)
      .where('status', 'active')
      .groupBy('schedule_id');

    studentCounts = counts.reduce((acc, item) => {
      acc[item.schedule_id] = parseInt(item.student_count);
      return acc;
    }, {});
  }

  const schedulesWithCounts = schedules.map(schedule => ({
    ...schedule,
    current_students: studentCounts[schedule.id] || 0,
    available_spots: schedule.max_students - (studentCounts[schedule.id] || 0)
  }));

  const totalQuery = db('schedules')
    .join('courses', 'schedules.course_id', 'courses.id')
    .count('* as total');

  if (course_id) totalQuery.where('schedules.course_id', course_id);
  if (teacher_id) totalQuery.where('schedules.teacher_id', teacher_id);
  if (room_id) totalQuery.where('schedules.room_id', room_id);
  if (day_of_week) totalQuery.where('schedules.day_of_week', day_of_week);
  if (status) totalQuery.where('schedules.status', status);
  if (branch_id) totalQuery.where('courses.branch_id', branch_id);
  if (req.user.role !== 'owner') {
    totalQuery.where('courses.branch_id', req.user.branch_id);
  }

  const [{ total }] = await totalQuery;

  res.json({
    success: true,
    data: {
      schedules: schedulesWithCounts,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: parseInt(total),
        total_pages: Math.ceil(total / limit)
      }
    }
  });
});

// @desc    Get schedule by ID
// @route   GET /api/v1/schedules/:id
// @access  Private
const getSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const schedule = await getScheduleWithDetails(id);

  if (!schedule) {
    return res.status(404).json({
      success: false,
      message: 'Schedule not found'
    });
  }

  // Check branch permissions
  if (req.user.role !== 'owner' && schedule.branch_id !== req.user.branch_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  res.json({
    success: true,
    data: { schedule }
  });
});

// @desc    Update schedule
// @route   PUT /api/v1/schedules/:id
// @access  Private (Admin, Owner)
const updateSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Check if schedule exists and get current data
  const currentSchedule = await getScheduleWithDetails(id);
  if (!currentSchedule) {
    return res.status(404).json({
      success: false,
      message: 'Schedule not found'
    });
  }

  // Check permissions
  if (req.user.role !== 'owner' && currentSchedule.branch_id !== req.user.branch_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Check for conflicts if changing teacher, room, or time
  const { teacher_id, room_id, day_of_week, start_time, end_time } = updateData;
  if ((teacher_id || room_id) && (day_of_week || start_time || end_time)) {
    const conflicts = await checkScheduleConflicts(
      teacher_id || currentSchedule.teacher_id,
      room_id || currentSchedule.room_id,
      day_of_week || currentSchedule.day_of_week,
      start_time || currentSchedule.start_time,
      end_time || currentSchedule.end_time,
      id
    );
    
    if (conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Schedule conflicts detected',
        conflicts
      });
    }
  }

  // Prepare update data
  const allowedFields = [
    'teacher_id', 'room_id', 'schedule_name', 'day_of_week', 
    'start_time', 'end_time', 'duration_hours', 'max_students',
    'schedule_type', 'recurring_pattern', 'start_date', 'end_date',
    'status', 'notes'
  ];

  const scheduleUpdateData = {};
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      scheduleUpdateData[field] = updateData[field];
    }
  }

  if (Object.keys(scheduleUpdateData).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No valid fields to update'
    });
  }

  await db('schedules').where('id', id).update(scheduleUpdateData);

  // Get updated schedule
  const updatedSchedule = await getScheduleWithDetails(id);

  res.json({
    success: true,
    message: 'Schedule updated successfully',
    data: { schedule: updatedSchedule }
  });
});

// @desc    Delete schedule
// @route   DELETE /api/v1/schedules/:id
// @access  Private (Admin, Owner)
const deleteSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const schedule = await getScheduleWithDetails(id);
  if (!schedule) {
    return res.status(404).json({
      success: false,
      message: 'Schedule not found'
    });
  }

  // Check permissions
  if (req.user.role !== 'owner' && schedule.branch_id !== req.user.branch_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Check if there are active students
  const activeStudents = await db('schedule_students')
    .where('schedule_id', id)
    .where('status', 'active')
    .count('* as count')
    .first();

  if (activeStudents.count > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete schedule. There are ${activeStudents.count} active students enrolled.`
    });
  }

  await db('schedules').where('id', id).del();

  res.json({
    success: true,
    message: 'Schedule deleted successfully'
  });
});

// @desc    Assign student to schedule
// @route   POST /api/v1/schedules/:id/students
// @access  Private (Admin, Owner)
const assignStudentToSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { student_id, total_amount = 0, notes } = req.body;

  if (!student_id) {
    return res.status(400).json({
      success: false,
      message: 'student_id is required'
    });
  }

  // Check if schedule exists
  const schedule = await getScheduleWithDetails(id);
  if (!schedule) {
    return res.status(404).json({
      success: false,
      message: 'Schedule not found'
    });
  }

  // Check permissions
  if (req.user.role !== 'owner' && schedule.branch_id !== req.user.branch_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Check if schedule is full
  if (schedule.current_students >= schedule.max_students) {
    return res.status(400).json({
      success: false,
      message: 'Schedule is full'
    });
  }

  // Check if student is already enrolled
  const existingEnrollment = await db('schedule_students')
    .where('schedule_id', id)
    .where('student_id', student_id)
    .first();

  if (existingEnrollment) {
    return res.status(400).json({
      success: false,
      message: 'Student is already enrolled in this schedule'
    });
  }

  // Check if student exists
  const student = await db('students')
    .join('users', 'students.user_id', 'users.id')
    .select('students.*', 'users.branch_id')
    .where('students.id', student_id)
    .first();

  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Student not found'
    });
  }

  // Enroll student
  const enrollmentId = await db.transaction(async (trx) => {
    const [enrollId] = await trx('schedule_students').insert({
      schedule_id: id,
      student_id: student_id,
      enrollment_date: new Date(),
      status: 'active',
      total_amount: parseFloat(total_amount),
      notes: notes || null
    });

    // Update current students count in schedule
    await trx('schedules')
      .where('id', id)
      .increment('current_students', 1);

    return enrollId;
  });

  // Get enrollment details
  const enrollment = await db('schedule_students')
    .join('students', 'schedule_students.student_id', 'students.id')
    .join('users', 'students.user_id', 'users.id')
    .select(
      'schedule_students.*',
      'students.first_name',
      'students.last_name',
      'users.phone',
      'users.email'
    )
    .where('schedule_students.id', enrollmentId)
    .first();

  res.status(201).json({
    success: true,
    message: 'Student assigned to schedule successfully',
    data: { enrollment }
  });
});

// @desc    Remove student from schedule
// @route   DELETE /api/v1/schedules/:id/students/:student_id
// @access  Private (Admin, Owner)
const removeStudentFromSchedule = asyncHandler(async (req, res) => {
  const { id, student_id } = req.params;
  const { reason } = req.body;

  // Check if enrollment exists
  const enrollment = await db('schedule_students')
    .where('schedule_id', id)
    .where('student_id', student_id)
    .first();

  if (!enrollment) {
    return res.status(404).json({
      success: false,
      message: 'Student enrollment not found in this schedule'
    });
  }

  // Check permissions
  const schedule = await getScheduleWithDetails(id);
  if (req.user.role !== 'owner' && schedule.branch_id !== req.user.branch_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  await db.transaction(async (trx) => {
    // Update enrollment status instead of deleting
    await trx('schedule_students')
      .where('schedule_id', id)
      .where('student_id', student_id)
      .update({
        status: 'cancelled',
        notes: reason || 'Student removed from schedule'
      });

    // Update current students count in schedule
    await trx('schedules')
      .where('id', id)
      .decrement('current_students', 1);
  });

  res.json({
    success: true,
    message: 'Student removed from schedule successfully'
  });
});

// @desc    Get schedule students
// @route   GET /api/v1/schedules/:id/students
// @access  Private
const getScheduleStudents = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status = 'active' } = req.query;

  // Check if schedule exists and permissions
  const schedule = await getScheduleWithDetails(id);
  if (!schedule) {
    return res.status(404).json({
      success: false,
      message: 'Schedule not found'
    });
  }

  if (req.user.role !== 'owner' && schedule.branch_id !== req.user.branch_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  let query = db('schedule_students')
    .join('students', 'schedule_students.student_id', 'students.id')
    .join('users', 'students.user_id', 'users.id')
    .select(
      'schedule_students.*',
      'students.first_name',
      'students.last_name',
      'students.nickname',
      'students.cefr_level',
      'users.phone',
      'users.email',
      'users.line_id'
    )
    .where('schedule_students.schedule_id', id);

  if (status) {
    query = query.where('schedule_students.status', status);
  }

  const students = await query.orderBy('schedule_students.enrollment_date', 'desc');

  res.json({
    success: true,
    data: {
      schedule: {
        id: schedule.id,
        schedule_name: schedule.schedule_name,
        course_name: schedule.course_name,
        day_of_week: schedule.day_of_week,
        start_time: schedule.start_time,
        end_time: schedule.end_time
      },
      students: students
    }
  });
});

// @desc    Create schedule exception (cancel, reschedule, etc.)
// @route   POST /api/v1/schedules/:id/exceptions
// @access  Private (Admin, Owner)
const createScheduleException = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    exception_date,
    exception_type,
    new_date,
    new_start_time,
    new_end_time,
    new_teacher_id,
    new_room_id,
    reason,
    notes
  } = req.body;

  if (!exception_date || !exception_type || !reason) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: exception_date, exception_type, reason'
    });
  }

  // Check if schedule exists
  const schedule = await getScheduleWithDetails(id);
  if (!schedule) {
    return res.status(404).json({
      success: false,
      message: 'Schedule not found'
    });
  }

  // Check permissions
  if (req.user.role !== 'owner' && schedule.branch_id !== req.user.branch_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }


    // Ensure id and exception_date are primitive values
    const scheduleId = (typeof id === 'object' && id !== null) ? (id.id || String(id)) : id;
    const exceptionDate = (typeof exception_date === 'object' && exception_date !== null) ? (exception_date.date || String(exception_date)) : exception_date;
    const existingException = await db('schedule_exceptions')
      .where('schedule_id', scheduleId)
      .where('exception_date', exceptionDate)
      .first();

    if (existingException) {
      return res.status(400).json({
        success: false,
        message: 'Exception already exists for this date'
      });
    }

  const exceptionId = await db.transaction(async (trx) => {
    // Insert the exception
    const [insertedId] = await trx('schedule_exceptions').insert({
      schedule_id: scheduleId,
      exception_date: exceptionDate,
      exception_type,
      new_date: new_date || null,
      new_start_time: new_start_time || null,
      new_end_time: new_end_time || null,
      new_teacher_id: new_teacher_id || null,
      new_room_id: new_room_id || null,
      reason,
      notes: notes || null,
      created_by: req.user.id,
      status: 'approved'
    });

    // Update affected schedule sessions based on exception type
    if (exception_type === 'cancellation') {
      // Cancel sessions on this date
      await trx('schedule_sessions')
        .where('schedule_id', scheduleId)
        .where('session_date', exceptionDate)
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          notes: `Cancelled: ${reason}`,
          updated_at: new Date()
        });
    } else if (exception_type === 'reschedule' && new_date) {
      // Reschedule sessions to new date
      await trx('schedule_sessions')
        .where('schedule_id', scheduleId)
        .where('session_date', exceptionDate)
        .update({
          session_date: new_date,
          start_time: new_start_time || trx.raw('start_time'),
          end_time: new_end_time || trx.raw('end_time'),
          teacher_id: new_teacher_id || trx.raw('teacher_id'),
          room_id: new_room_id || trx.raw('room_id'),
          notes: `Rescheduled from ${exceptionDate}: ${reason}`,
          updated_at: new Date()
        });
    } else if (exception_type === 'teacher_change' && new_teacher_id) {
      // Change teacher for sessions on this date
      await trx('schedule_sessions')
        .where('schedule_id', scheduleId)
        .where('session_date', exceptionDate)
        .update({
          teacher_id: new_teacher_id,
          notes: `Teacher changed: ${reason}`,
          updated_at: new Date()
        });
    } else if (exception_type === 'room_change' && new_room_id) {
      // Change room for sessions on this date
      await trx('schedule_sessions')
        .where('schedule_id', scheduleId)
        .where('session_date', exceptionDate)
        .update({
          room_id: new_room_id,
          notes: `Room changed: ${reason}`,
          updated_at: new Date()
        });
    } else if (exception_type === 'time_change' && (new_start_time || new_end_time)) {
      // Change time for sessions on this date
      const updateData = {
        notes: `Time changed: ${reason}`,
        updated_at: new Date()
      };
      if (new_start_time) updateData.start_time = new_start_time;
      if (new_end_time) updateData.end_time = new_end_time;
      
      await trx('schedule_sessions')
        .where('schedule_id', scheduleId)
        .where('session_date', exceptionDate)
        .update(updateData);
    }

    return insertedId;
  });

  const exception = await db('schedule_exceptions')
    .leftJoin('teachers', 'schedule_exceptions.new_teacher_id', 'teachers.id')
    .leftJoin('rooms', 'schedule_exceptions.new_room_id', 'rooms.id')
    .select(
      'schedule_exceptions.*',
      'teachers.first_name as new_teacher_first_name',
      'teachers.last_name as new_teacher_last_name',
      'rooms.room_name as new_room_name'
    )
    .where('schedule_exceptions.id', exceptionId)
    .first();

  res.status(201).json({
    success: true,
    message: 'Schedule exception created successfully and affected sessions updated',
    data: { exception }
  });
});

// @desc    Create makeup session
// @route   POST /api/v1/schedules/:id/makeup
// @access  Private (Admin, Owner)
const createMakeupSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    original_session_id,
    makeup_date,
    makeup_start_time,
    makeup_end_time,
    teacher_id,
    room_id,
    reason,
    notes
  } = req.body;

  if (!original_session_id || !makeup_date || !makeup_start_time || !makeup_end_time) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: original_session_id, makeup_date, makeup_start_time, makeup_end_time'
    });
  }

  // Check if schedule exists
  const schedule = await getScheduleWithDetails(id);
  if (!schedule) {
    return res.status(404).json({
      success: false,
      message: 'Schedule not found'
    });
  }

  // Check permissions
  if (req.user.role !== 'owner' && schedule.branch_id !== req.user.branch_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Check if original session exists and is cancelled
  const originalSession = await db('schedule_sessions')
    .where('id', original_session_id)
    .where('schedule_id', id)
    .first();

  if (!originalSession) {
    return res.status(404).json({
      success: false,
      message: 'Original session not found'
    });
  }

  if (originalSession.status !== 'cancelled') {
    return res.status(400).json({
      success: false,
      message: 'Can only create makeup sessions for cancelled sessions'
    });
  }

  // Check if makeup session already exists for this original session
  const existingMakeup = await db('schedule_sessions')
    .where('makeup_for_session_id', original_session_id)
    .first();

  if (existingMakeup) {
    return res.status(400).json({
      success: false,
      message: 'Makeup session already exists for this cancelled session'
    });
  }

  // Create makeup session
  const makeupSessionId = await db.transaction(async (trx) => {
    const [insertedId] = await trx('schedule_sessions').insert({
      schedule_id: id,
      time_slot_id: originalSession.time_slot_id,
      session_date: makeup_date,
      session_number: originalSession.session_number,
      week_number: originalSession.week_number,
      start_time: makeup_start_time,
      end_time: makeup_end_time,
      teacher_id: teacher_id || originalSession.teacher_id,
      room_id: room_id || originalSession.room_id,
      status: 'scheduled',
      makeup_for_session_id: original_session_id,
      is_makeup_session: true,
      notes: notes || `Makeup session for ${originalSession.session_date} - ${reason || 'Session cancelled'}`,
      created_at: new Date(),
      updated_at: new Date()
    });

    return insertedId;
  });

  // Get created makeup session with details
  const makeupSession = await db('schedule_sessions')
    .leftJoin('schedule_time_slots', 'schedule_sessions.time_slot_id', 'schedule_time_slots.id')
    .leftJoin('teachers', 'schedule_sessions.teacher_id', 'teachers.id')
    .leftJoin('rooms', 'schedule_sessions.room_id', 'rooms.id')
    .select(
      'schedule_sessions.*',
      'schedule_time_slots.day_of_week',
      'teachers.first_name as teacher_first_name',
      'teachers.last_name as teacher_last_name',
      'rooms.room_name'
    )
    .where('schedule_sessions.id', makeupSessionId)
    .first();

  res.status(201).json({
    success: true,
    message: 'Makeup session created successfully',
    data: { 
      makeup_session: makeupSession,
      original_session: originalSession
    }
  });
});

// @desc    Handle student leave request
// @route   POST /api/v1/schedules/:id/leave
// @access  Private (Admin, Owner)
const handleStudentLeave = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    student_id,
    leave_date,
    leave_type, // 'sick_leave', 'personal_leave', 'emergency'
    reason,
    advance_notice_hours = 0, // แจ้งล่วงหน้ากี่ชั่วโมง
    notes
  } = req.body;

  if (!student_id || !leave_date || !leave_type || !reason) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: student_id, leave_date, leave_type, reason'
    });
  }

  // Check if schedule exists
  const schedule = await getScheduleWithDetails(id);
  if (!schedule) {
    return res.status(404).json({
      success: false,
      message: 'Schedule not found'
    });
  }

  // Check permissions
  if (req.user.role !== 'owner' && schedule.branch_id !== req.user.branch_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Check if student is enrolled in this schedule
  const enrollment = await db('schedule_students')
    .join('students', 'schedule_students.student_id', 'students.id')
    .select('schedule_students.*', 'students.date_of_birth')
    .where('schedule_students.schedule_id', id)
    .where('schedule_students.student_id', student_id)
    .where('schedule_students.status', 'active')
    .first();

  if (!enrollment) {
    return res.status(404).json({
      success: false,
      message: 'Student not enrolled in this schedule'
    });
  }

  // Calculate student age for leave policy
  const age = enrollment.date_of_birth 
    ? Math.floor((new Date() - new Date(enrollment.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  // Get course hours and class type to determine leave rights
  const courseHours = schedule.total_hours;
  const currentStudents = schedule.current_students;
  const isPrivateClass = currentStudents === 1;
  
  // Calculate leave rights based on policy
  let allowedLeaves = 0;
  let allowedMakeups = 0;
  
  if (isPrivateClass) {
    // Private class (1 student)
    if (courseHours === 40 || courseHours === 50) {
      allowedLeaves = 1;
      allowedMakeups = 1;
    } else if (courseHours === 60) {
      allowedLeaves = 3;
      allowedMakeups = 2;
    }
    // Special rule for children under 10
    if (age && age < 10 && courseHours < 60) {
      allowedLeaves = 3;
    }
  } else {
    // Group class (2+ students) - no leave rights, only makeup
    if (courseHours === 40 || courseHours === 50) {
      allowedMakeups = 1;
    } else if (courseHours === 60) {
      allowedMakeups = 2;
    }
  }

  // Check current leave usage
  const usedLeaves = await db('schedule_sessions')
    .join('student_attendances', 'schedule_sessions.id', 'student_attendances.session_id')
    .where('schedule_sessions.schedule_id', id)
    .where('student_attendances.student_id', student_id)
    .where('student_attendances.status', 'approved_leave')
    .count('* as count')
    .first();

  const currentLeaveCount = parseInt(usedLeaves.count);

  // Check if student has leave rights remaining
  if (isPrivateClass && currentLeaveCount >= allowedLeaves) {
    return res.status(400).json({
      success: false,
      message: `Student has exhausted leave rights. Used: ${currentLeaveCount}/${allowedLeaves}`
    });
  }

  // Check advance notice requirement for private classes
  if (isPrivateClass && advance_notice_hours < 24) {
    return res.status(400).json({
      success: false,
      message: 'Private classes require at least 24 hours advance notice for leave'
    });
  }

  // Process the leave request
  const leaveResult = await db.transaction(async (trx) => {
    // Find the session on leave date
    const sessionOnLeaveDate = await trx('schedule_sessions')
      .where('schedule_id', id)
      .where('session_date', leave_date)
      .first();

    if (!sessionOnLeaveDate) {
      throw new Error('No session found on the specified leave date');
    }

    // Create attendance record for leave
    const [attendanceId] = await trx('student_attendances').insert({
      session_id: sessionOnLeaveDate.id,
      student_id: student_id,
      status: isPrivateClass ? 'approved_leave' : 'excused_absence',
      leave_type: leave_type,
      reason: reason,
      advance_notice_hours: advance_notice_hours,
      notes: notes || null,
      approved_by: req.user.id,
      approved_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    });

    // If it's a group class and they're entitled to makeup, create makeup eligibility
    if (!isPrivateClass) {
      await trx('makeup_eligibilities').insert({
        student_id: student_id,
        original_session_id: sessionOnLeaveDate.id,
        schedule_id: id,
        reason: 'Group class absence - makeup eligible',
        status: 'pending',
        created_by: req.user.id,
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    return { attendanceId, sessionId: sessionOnLeaveDate.id };
  });

  res.status(201).json({
    success: true,
    message: isPrivateClass 
      ? `Leave approved. Remaining leaves: ${allowedLeaves - currentLeaveCount - 1}/${allowedLeaves}`
      : `Absence recorded. Makeup session can be scheduled.`,
    data: {
      leave_approved: true,
      is_private_class: isPrivateClass,
      remaining_leaves: isPrivateClass ? allowedLeaves - currentLeaveCount - 1 : 0,
      makeup_eligible: !isPrivateClass || allowedMakeups > 0,
      leave_policy: {
        total_allowed_leaves: allowedLeaves,
        total_allowed_makeups: allowedMakeups,
        current_leave_count: currentLeaveCount + 1
      }
    }
  });
});

// @desc    Handle course drop/pause
// @route   POST /api/v1/schedules/:id/drop
// @access  Private (Admin, Owner)
const handleCourseDrop = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    student_id,
    drop_type, // 'temporary' or 'permanent'
    drop_date,
    expected_return_date, // only for temporary drops
    reason,
    preserve_schedule = true, // whether to preserve time slot
    notes
  } = req.body;

  if (!student_id || !drop_type || !drop_date || !reason) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: student_id, drop_type, drop_date, reason'
    });
  }

  // Check if schedule exists
  const schedule = await getScheduleWithDetails(id);
  if (!schedule) {
    return res.status(404).json({
      success: false,
      message: 'Schedule not found'
    });
  }

  // Check permissions
  if (req.user.role !== 'owner' && schedule.branch_id !== req.user.branch_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Check if student is enrolled
  const enrollment = await db('schedule_students')
    .where('schedule_id', id)
    .where('student_id', student_id)
    .where('status', 'active')
    .first();

  if (!enrollment) {
    return res.status(404).json({
      success: false,
      message: 'Student not enrolled in this schedule'
    });
  }

  // Check drop history to enforce 1-2 drops limit
  const previousDrops = await db('course_drops')
    .where('schedule_id', id)
    .where('student_id', student_id)
    .count('* as count')
    .first();

  if (parseInt(previousDrops.count) >= 2) { // Admin can allow up to 2 drops
    return res.status(400).json({
      success: false,
      message: 'Student has reached maximum allowed drops (2)'
    });
  }

  const dropResult = await db.transaction(async (trx) => {
    // Create drop record
    const [dropId] = await trx('course_drops').insert({
      schedule_id: id,
      student_id: student_id,
      drop_type: drop_type,
      drop_date: drop_date,
      expected_return_date: drop_type === 'temporary' ? expected_return_date : null,
      reason: reason,
      preserve_schedule: preserve_schedule,
      notes: notes || null,
      created_by: req.user.id,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    });

    // Update enrollment status to paused
    await trx('schedule_students')
      .where('schedule_id', id)
      .where('student_id', student_id)
      .update({
        status: 'paused',
        notes: `Course dropped: ${reason}`,
        updated_at: new Date()
      });

    // Cancel future sessions for this student starting from drop date
    const futureSessions = await trx('schedule_sessions')
      .where('schedule_id', id)
      .where('session_date', '>=', drop_date)
      .where('status', 'scheduled');

    for (const session of futureSessions) {
      // Mark student as absent for future sessions
      await trx('student_attendances').insert({
        session_id: session.id,
        student_id: student_id,
        status: 'course_dropped',
        reason: `Course dropped on ${drop_date}: ${reason}`,
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    // If it's temporary drop with return date, create schedule reservation
    if (drop_type === 'temporary' && expected_return_date && preserve_schedule) {
      await trx('schedule_reservations').insert({
        schedule_id: id,
        student_id: student_id,
        reserved_from: drop_date,
        reserved_until: expected_return_date,
        status: 'reserved',
        created_by: req.user.id,
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    return dropId;
  });

  res.status(201).json({
    success: true,
    message: `Course ${drop_type} drop processed successfully`,
    data: {
      drop_id: dropResult,
      drop_type: drop_type,
      drop_date: drop_date,
      expected_return_date: expected_return_date,
      schedule_preserved: preserve_schedule,
      previous_drops: parseInt(previousDrops.count),
      remaining_drops: 2 - parseInt(previousDrops.count) - 1
    }
  });
});

// @desc    Get makeup sessions for schedule
// @route   GET /api/v1/schedules/:id/makeup
// @access  Private
const getMakeupSessions = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if schedule exists and permissions
  const schedule = await getScheduleWithDetails(id);
  if (!schedule) {
    return res.status(404).json({
      success: false,
      message: 'Schedule not found'
    });
  }

  if (req.user.role !== 'owner' && schedule.branch_id !== req.user.branch_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Get makeup sessions with original session details
  const makeupSessions = await db('schedule_sessions as makeup')
    .join('schedule_sessions as original', 'makeup.makeup_for_session_id', 'original.id')
    .leftJoin('teachers', 'makeup.teacher_id', 'teachers.id')
    .leftJoin('rooms', 'makeup.room_id', 'rooms.id')
    .select(
      'makeup.*',
      'original.session_date as original_date',
      'original.start_time as original_start_time',
      'original.end_time as original_end_time',
      'original.cancellation_reason',
      'teachers.first_name as teacher_first_name',
      'teachers.last_name as teacher_last_name',
      'rooms.room_name'
    )
    .where('makeup.schedule_id', id)
    .where('makeup.is_makeup_session', true)
    .orderBy('makeup.session_date', 'asc');

  res.json({
    success: true,
    data: {
      schedule: {
        id: schedule.id,
        schedule_name: schedule.schedule_name,
        course_name: schedule.course_name
      },
      makeup_sessions: makeupSessions
    }
  });
});

// @desc    Get schedule sessions with exceptions
// @route   GET /api/v1/schedules/:id/sessions
// @access  Private
const getScheduleSessions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { 
    status,
    start_date, 
    end_date,
    include_cancelled = 'false'
  } = req.query;

  // Check if schedule exists and permissions
  const schedule = await getScheduleWithDetails(id);
  if (!schedule) {
    return res.status(404).json({
      success: false,
      message: 'Schedule not found'
    });
  }

  if (req.user.role !== 'owner' && schedule.branch_id !== req.user.branch_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  let query = db('schedule_sessions')
    .leftJoin('schedule_time_slots', 'schedule_sessions.time_slot_id', 'schedule_time_slots.id')
    .leftJoin('teachers', 'schedule_sessions.teacher_id', 'teachers.id')
    .leftJoin('rooms', 'schedule_sessions.room_id', 'rooms.id')
    .select(
      'schedule_sessions.*',
      'schedule_time_slots.day_of_week',
      'teachers.first_name as teacher_first_name',
      'teachers.last_name as teacher_last_name',
      'rooms.room_name'
    )
    .where('schedule_sessions.schedule_id', id);

  // Apply filters
  if (status) {
    query = query.where('schedule_sessions.status', status);
  }
  if (start_date) {
    query = query.where('schedule_sessions.session_date', '>=', start_date);
  }
  if (end_date) {
    query = query.where('schedule_sessions.session_date', '<=', end_date);
  }
  if (include_cancelled !== 'true') {
    query = query.where('schedule_sessions.status', '!=', 'cancelled');
  }

  const sessions = await query.orderBy('schedule_sessions.session_date', 'asc').orderBy('schedule_sessions.start_time', 'asc');

  // Get related exceptions
  const exceptions = await db('schedule_exceptions')
    .where('schedule_id', id)
    .orderBy('exception_date', 'asc');

  res.json({
    success: true,
    data: {
      schedule: {
        id: schedule.id,
        schedule_name: schedule.schedule_name,
        course_name: schedule.course_name,
        status: schedule.status
      },
      sessions: sessions,
      exceptions: exceptions,
      summary: {
        total_sessions: sessions.length,
        scheduled: sessions.filter(s => s.status === 'scheduled').length,
        completed: sessions.filter(s => s.status === 'completed').length,
        cancelled: sessions.filter(s => s.status === 'cancelled').length,
        total_exceptions: exceptions.length
      }
    }
  });
});

// @desc    Get weekly schedule view
// @route   GET /api/v1/schedules/weekly
// @access  Private
const getWeeklySchedule = asyncHandler(async (req, res) => {
  const { week_start, teacher_id, room_id, branch_id } = req.query;

  let query = db('schedules')
    .join('courses', 'schedules.course_id', 'courses.id')
    .leftJoin('teachers', 'schedules.teacher_id', 'teachers.id')
    .leftJoin('rooms', 'schedules.room_id', 'rooms.id')
    .leftJoin('branches', 'courses.branch_id', 'branches.id')
    .select(
      'schedules.*',
      'courses.name as course_name',
      'courses.code as course_code',
      'teachers.first_name as teacher_first_name',
      'teachers.last_name as teacher_last_name',
      'rooms.room_name',
      'branches.name as branch_name'
    )
    .where('schedules.status', 'active');

  // Apply filters
  if (teacher_id) query = query.where('schedules.teacher_id', teacher_id);
  if (room_id) query = query.where('schedules.room_id', room_id);
  if (branch_id) query = query.where('courses.branch_id', branch_id);

  // Branch permission check
  if (req.user.role !== 'owner') {
    query = query.where('courses.branch_id', req.user.branch_id);
  }

  const schedules = await query.orderBy('schedules.day_of_week', 'asc').orderBy('schedules.start_time', 'asc');

  // Get student counts
  const scheduleIds = schedules.map(s => s.id);
  let studentCounts = {};
  
  if (scheduleIds.length > 0) {
    const counts = await db('schedule_students')
      .select('schedule_id')
      .count('id as student_count')
      .whereIn('schedule_id', scheduleIds)
      .where('status', 'active')
      .groupBy('schedule_id');

    studentCounts = counts.reduce((acc, item) => {
      acc[item.schedule_id] = parseInt(item.student_count);
      return acc;
    }, {});
  }

  // Get exceptions for the week if week_start is provided
  let exceptions = [];
  if (week_start) {
    const weekEnd = new Date(week_start);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    exceptions = await db('schedule_exceptions')
      .leftJoin('teachers', 'schedule_exceptions.new_teacher_id', 'teachers.id')
      .leftJoin('rooms', 'schedule_exceptions.new_room_id', 'rooms.id')
      .select(
        'schedule_exceptions.*',
        'teachers.first_name as new_teacher_first_name',
        'teachers.last_name as new_teacher_last_name',
        'rooms.room_name as new_room_name'
      )
      .whereIn('schedule_exceptions.schedule_id', scheduleIds)
      .whereBetween('schedule_exceptions.exception_date', [week_start, weekEnd.toISOString().split('T')[0]])
      .where('schedule_exceptions.status', 'approved');
  }

  // Organize schedules by day
  const weeklySchedule = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: []
  };

  schedules.forEach(schedule => {
    const scheduleWithCounts = {
      ...schedule,
      current_students: studentCounts[schedule.id] || 0,
      available_spots: schedule.max_students - (studentCounts[schedule.id] || 0),
      exceptions: exceptions.filter(ex => ex.schedule_id === schedule.id)
    };

    weeklySchedule[schedule.day_of_week].push(scheduleWithCounts);
  });

  res.json({
    success: true,
    data: {
      week_start: week_start || null,
      weekly_schedule: weeklySchedule,
      total_schedules: schedules.length,
      total_exceptions: exceptions.length
    }
  });
});

// Helper function to get schedule with details
const getScheduleWithDetails = async (scheduleId) => {
  const schedule = await db('schedules')
    .join('courses', 'schedules.course_id', 'courses.id')
    .leftJoin('teachers', 'schedules.teacher_id', 'teachers.id')
    .leftJoin('rooms', 'schedules.room_id', 'rooms.id')
    .leftJoin('branches', 'courses.branch_id', 'branches.id')
    .select(
      'schedules.*',
      'courses.name as course_name',
      'courses.code as course_code',
      'courses.branch_id',
      'teachers.first_name as teacher_first_name',
      'teachers.last_name as teacher_last_name',
      'rooms.room_name',
      'rooms.capacity as room_capacity',
      'branches.name as branch_name'
    )
    .where('schedules.id', scheduleId)
    .first();

  if (schedule) {
    // Get current students count
    const studentCount = await db('schedule_students')
      .where('schedule_id', scheduleId)
      .where('status', 'active')
      .count('* as count')
      .first();

    schedule.current_students = parseInt(studentCount.count);
    schedule.available_spots = schedule.max_students - schedule.current_students;
  }

  return schedule;
};

// Helper function to check schedule conflicts
const checkScheduleConflicts = async (teacherId, roomId, dayOfWeek, startTime, endTime, excludeScheduleId = null) => {
  const conflicts = [];

  // Check teacher conflicts
  if (teacherId) {
    let teacherQuery = db('schedules')
      .join('courses', 'schedules.course_id', 'courses.id')
      .join('rooms', 'schedules.room_id', 'rooms.id')
      .select(
        'schedules.*',
        'courses.name as course_name',
        'rooms.room_name'
      )
      .where('schedules.teacher_id', teacherId)
      .where('schedules.day_of_week', dayOfWeek)
      .where('schedules.status', '!=', 'cancelled')
      .where(function() {
        this.where(function() {
          this.where('schedules.start_time', '<=', startTime)
            .where('schedules.end_time', '>', startTime);
        }).orWhere(function() {
          this.where('schedules.start_time', '<', endTime)
            .where('schedules.end_time', '>=', endTime);
        }).orWhere(function() {
          this.where('schedules.start_time', '>=', startTime)
            .where('schedules.end_time', '<=', endTime);
        });
      });

    if (excludeScheduleId) {
      teacherQuery = teacherQuery.where('schedules.id', '!=', excludeScheduleId);
    }

    const teacherConflicts = await teacherQuery;
    if (teacherConflicts.length > 0) {
      conflicts.push({
        type: 'teacher',
        message: 'Teacher has conflicting schedules',
        conflicts: teacherConflicts
      });
    }
  }

  // Check room conflicts
  if (roomId) {
    let roomQuery = db('schedules')
      .join('courses', 'schedules.course_id', 'courses.id')
      .leftJoin('teachers', 'schedules.teacher_id', 'teachers.id')
      .select(
        'schedules.*',
        'courses.name as course_name',
        'teachers.first_name as teacher_first_name',
        'teachers.last_name as teacher_last_name'
      )
      .where('schedules.room_id', roomId)
      .where('schedules.day_of_week', dayOfWeek)
      .where('schedules.status', '!=', 'cancelled')
      .where(function() {
        this.where(function() {
          this.where('schedules.start_time', '<=', startTime)
            .where('schedules.end_time', '>', startTime);
        }).orWhere(function() {
          this.where('schedules.start_time', '<', endTime)
            .where('schedules.end_time', '>=', endTime);
        }).orWhere(function() {
          this.where('schedules.start_time', '>=', startTime)
            .where('schedules.end_time', '<=', endTime);
        });
      });

    if (excludeScheduleId) {
      roomQuery = roomQuery.where('schedules.id', '!=', excludeScheduleId);
    }

    const roomConflicts = await roomQuery;
    if (roomConflicts.length > 0) {
      conflicts.push({
        type: 'room',
        message: 'Room has conflicting schedules',
        conflicts: roomConflicts
      });
    }
  }

  return conflicts;
};


module.exports = {
  createSchedule,
  getSchedules,
  getSchedule,
  updateSchedule,
  deleteSchedule,
  assignStudentToSchedule,
  removeStudentFromSchedule,
  getScheduleStudents,
  createScheduleException,
  createMakeupSession,
  getMakeupSessions,
  handleStudentLeave,
  handleCourseDrop,
  getScheduleSessions,
  getWeeklySchedule,
};