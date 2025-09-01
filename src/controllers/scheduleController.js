const { db } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

// Helper function to format date as YYYY-MM-DD in local timezone
const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
    .select('courses.*', 'branches.name_en as branch_name_en',
      'branches.name_th as branch_name_th',)
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
        estimated_end_date: formatLocalDate(estimatedEndDate),
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
const generateScheduleSessions = async (scheduleId, timeSlots, startDate, totalSessions, autoRescheduleHolidays) => {
  const sessions = [];
  // คำนวณช่วงปี พ.ศ. ที่เกี่ยวข้อง
  // Parse date as local date to avoid timezone issues
  const start = new Date(startDate + 'T00:00:00');
  const years = [];
  const endEstimate = new Date(start);
  endEstimate.setDate(endEstimate.getDate() + Math.ceil(totalSessions / timeSlots.length) * 7);
  let yearBE = start.getFullYear() + 543;
  let endYearBE = endEstimate.getFullYear() + 543;
  for (let y = yearBE; y <= endYearBE; y++) years.push(y);
  const holidays = await getHolidays(years);
  let sessionNumber = 1;
  let weekNumber = 1;

  const dayNumbers = {
    'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
    'thursday': 4, 'friday': 5, 'saturday': 6
  };

  // Group time slots by day of week
  const slotsByDay = {};
  timeSlots.forEach(slot => {
    if (!slotsByDay[slot.day_of_week]) {
      slotsByDay[slot.day_of_week] = [];
    }
    slotsByDay[slot.day_of_week].push(slot);
  });

  // Generate sessions starting from the actual start_date
  let currentDate = new Date(start);

  while (sessionNumber <= totalSessions) {
    const currentDayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // Check if there are sessions on this day
    if (slotsByDay[currentDayName]) {
      for (const timeSlot of slotsByDay[currentDayName]) {
        if (sessionNumber > totalSessions) break;

        const dateStr = formatLocalDate(currentDate); // Format as YYYY-MM-DD in local timezone

        // Check if session already exists to prevent duplicates
        const existingSession = await db('schedule_sessions')
          .where('schedule_id', scheduleId)
          .where('session_date', dateStr)
          .where('start_time', timeSlot.start_time)
          .where('end_time', timeSlot.end_time)
          .first();

        if (existingSession) {
          // Skip creating duplicate session
          continue;
        }

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
          session_date: dateStr, // Use the formatted date string
          session_number: sessionNumber,
          week_number: weekNumber,
          start_time: timeSlot.start_time,
          end_time: timeSlot.end_time,
          status,
          notes,
          is_makeup_session: false
        });

        sessionNumber++;
      }
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);

    // Update week number every 7 days
    if (currentDate.getDay() === start.getDay()) {
      weekNumber++;
    }
  }

  if (autoRescheduleHolidays) {
    const cancelledSessions = sessions.filter(s => s.status === 'cancelled');

    for (const cancelled of cancelledSessions) {
      const timeSlot = timeSlots.find(ts => ts.id === cancelled.time_slot_id);

      let makeupDate = new Date(cancelled.session_date);
      makeupDate.setDate(makeupDate.getDate() + 7);

      while (true) {
        const makeupDateStr = formatLocalDate(makeupDate);
        const isHoliday = holidays.some(h => h.date === makeupDateStr);
        const dayName = makeupDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

        if (!isHoliday && dayName === timeSlot.day_of_week) {
          break;
        }

        makeupDate.setDate(makeupDate.getDate() + 1);
      }

      const makeupDateStr = formatLocalDate(makeupDate);

      // Check if makeup session already exists to prevent duplicates
      const existingMakeupSession = await db('schedule_sessions')
        .where('schedule_id', scheduleId)
        .where('session_date', makeupDateStr)
        .where('start_time', timeSlot.start_time)
        .where('end_time', timeSlot.end_time)
        .where('is_makeup_session', true)
        .first();

      if (!existingMakeupSession) {
        sessions.push({
          schedule_id: scheduleId,
          time_slot_id: cancelled.time_slot_id,
          session_date: makeupDateStr,
          session_number: cancelled.session_number,
          week_number: cancelled.week_number,
          start_time: timeSlot.start_time,
          end_time: timeSlot.end_time,
          status: 'scheduled',
          is_makeup_session: true,
          notes: `Makeup session for ${cancelled.session_date} - ${cancelled.notes}`
        });
      }
    }
  }

  return sessions;
};

// Helper function to get holidays (with cache + timeout)
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Simple in-memory cache for holidays by Buddhist year (BE)
const HOLIDAYS_CACHE = new Map(); // key: yearBE, value: { data: [...], ts: epoch_ms }
const HOLIDAYS_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const fetchWithTimeout = async (url, timeoutMs = 1500) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
};

// ดึงวันหยุดจาก myhora.com ตามปี พ.ศ. ที่ส่งมา (cached + fast-fail)
const getHolidays = async (years) => {
  const allHolidays = [];
  for (const yearBE of years) {
    try {
      // Serve from cache when fresh
      const cached = HOLIDAYS_CACHE.get(yearBE);
      if (cached && (Date.now() - cached.ts) < HOLIDAYS_TTL_MS) {
        allHolidays.push(...cached.data);
        continue;
      }

      const url = `https://www.myhora.com/calendar/ical/holiday.aspx?${yearBE}.json`;
      const resp = await fetchWithTimeout(url, 1500); // fast-fail in 1.5s
      if (!resp.ok) continue;
      const data = await resp.json();
      const converted = [];
      if (Array.isArray(data)) {
        for (const item of data) {
          // item.Date: '2568-04-13', item.Title: 'วันสงกรานต์'
          let [y, m, d] = item.Date.split('-');
          y = (parseInt(y, 10) - 543).toString(); // convert BE -> CE
          const dateISO = `${y}-${m}-${d}`;
          converted.push({ date: dateISO, name: item.Title });
        }
      }
      // Cache and accumulate
      HOLIDAYS_CACHE.set(yearBE, { data: converted, ts: Date.now() });
      allHolidays.push(...converted);
    } catch (e) {
      // Timeout or fetch error -> skip this year gracefully
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
      'branches.name_en as branch_name_en',
      'branches.name_th as branch_name_th',
    );

  // Apply filters
  if (course_id) query = query.where('schedules.course_id', course_id);
  if (teacher_id) query = query.where('schedules.teacher_id', teacher_id);
  if (room_id) query = query.where('schedules.room_id', room_id);
  // Note: day_of_week filter removed as schedules no longer have single day_of_week
  // Day filtering should be done at the session level if needed
  if (status) query = query.where('schedules.status', status);
  if (branch_id) query = query.where('courses.branch_id', branch_id);

  // Branch permission check
  if (req.user.role !== 'owner') {
    query = query.where('courses.branch_id', req.user.branch_id);
  }

  const schedules = await query
    .orderBy('schedules.schedule_name', 'asc')
    .orderBy('schedules.start_date', 'asc')
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
  // Note: day_of_week filter removed as schedules no longer have single day_of_week
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

  // Check for conflicts if changing teacher or room
  // Note: Since schedules now have multiple time slots, conflict checking is more complex
  // For now, skip conflict checking to avoid database errors
  // TODO: Implement proper conflict checking for the new schema
  /*
  const { teacher_id, room_id } = updateData;
  if ((teacher_id || room_id)) {
    const conflicts = await checkScheduleConflicts(
      teacher_id || currentSchedule.teacher_id,
      room_id || currentSchedule.room_id,
      null, null, null, // No longer have single day_of_week/start_time/end_time
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
  */

  // Prepare update data
  const allowedFields = [
    'teacher_id', 'room_id', 'schedule_name', 'total_hours',
    'hours_per_session', 'max_students', 'schedule_type',
    'recurring_pattern', 'start_date', 'estimated_end_date',
    'status', 'notes', 'auto_reschedule_holidays'
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

  console.log(req.body)

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

  console.error(student);

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
        // Note: day_of_week, start_time, end_time are now in schedule_time_slots table
        // These fields are no longer available at the schedule level
      },
      students: students
    }
  });
});

// @desc    Add comment/note to session
// @route   POST /api/v1/schedules/:id/sessions/:sessionId/comments
// @access  Private (Admin, Owner)
const addSessionComment = asyncHandler(async (req, res) => {
  const { id, sessionId } = req.params;
  const { comment, type = 'note', is_private = false } = req.body;

  if (!comment) {
    return res.status(400).json({
      success: false,
      message: 'Comment text is required'
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

  // Check if session exists
  const session = await db('schedule_sessions')
    .where('id', sessionId)
    .where('schedule_id', id)
    .first();

  if (!session) {
    return res.status(404).json({
      success: false,
      message: 'Session not found in this schedule'
    });
  }

  // Add comment/note
  const [commentId] = await db('session_comments').insert({
    session_id: sessionId,
    user_id: req.user.id,
    comment: comment,
    type: type, // 'note', 'comment', 'warning', 'important'
    is_private: is_private,
    created_at: new Date(),
    updated_at: new Date()
  });

  // Get the created comment with user details
  const newComment = await db('session_comments')
    .join('users', 'session_comments.user_id', 'users.id')
    .select(
      'session_comments.*',
      'users.username',
      'users.first_name',
      'users.last_name'
    )
    .where('session_comments.id', commentId)
    .first();

  res.status(201).json({
    success: true,
    message: 'Comment added successfully',
    data: { comment: newComment }
  });
});

// @desc    Get session comments
// @route   GET /api/v1/schedules/:id/sessions/:sessionId/comments
// @access  Private
const getSessionComments = asyncHandler(async (req, res) => {
  const { id, sessionId } = req.params;
  const {
    type,
    include_private = 'false',
    page = 1,
    limit = 20,
    sort_by = 'created_at',
    sort_order = 'asc',
    user_id,
    search
  } = req.query;

  const offset = (page - 1) * limit;

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

  let query = db('session_comments')
    .join('users', 'session_comments.user_id', 'users.id')
    .select(
      'session_comments.*',
      'users.username',
      'users.first_name',
      'users.last_name'
    )
    .where('session_comments.session_id', sessionId);

  // Filter by type if specified
  if (type) {
    query = query.where('session_comments.type', type);
  }

  // Filter by user if specified
  if (user_id) {
    query = query.where('session_comments.user_id', user_id);
  }

  // Search in comment text
  if (search) {
    query = query.where('session_comments.comment', 'like', `%${search}%`);
  }

  // Handle private comments visibility
  if (include_private !== 'true') {
    query = query.where('session_comments.is_private', false);
  }

  // Get total count for pagination
  const totalQuery = query.clone().count('* as total');
  const [{ total }] = await totalQuery;

  // Apply sorting and pagination
  const validSortFields = ['created_at', 'updated_at', 'type', 'comment'];
  const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
  const sortDir = sort_order.toLowerCase() === 'desc' ? 'desc' : 'asc';

  const comments = await query
    .orderBy(`session_comments.${sortField}`, sortDir)
    .limit(parseInt(limit))
    .offset(parseInt(offset));

  res.json({
    success: true,
    data: {
      comments,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: parseInt(total),
        total_pages: Math.ceil(total / limit)
      }
    }
  });
});

// @desc    Update session comment
// @route   PUT /api/v1/schedules/:id/sessions/:sessionId/comments/:commentId
// @access  Private (Admin, Owner, Comment Author)
const updateSessionComment = asyncHandler(async (req, res) => {
  const { id, sessionId, commentId } = req.params;
  const { comment, type, is_private } = req.body;

  // Check if comment exists
  const existingComment = await db('session_comments')
    .where('id', commentId)
    .where('session_id', sessionId)
    .first();

  if (!existingComment) {
    return res.status(404).json({
      success: false,
      message: 'Comment not found'
    });
  }

  // Check permissions (owner, admin, or comment author)
  const schedule = await getScheduleWithDetails(id);
  const canEdit = req.user.role === 'owner' ||
    (req.user.role === 'admin' && schedule.branch_id === req.user.branch_id) ||
    existingComment.user_id === req.user.id;

  if (!canEdit) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only edit your own comments.'
    });
  }

  // Update comment
  const updateData = { updated_at: new Date() };
  if (comment !== undefined) updateData.comment = comment;
  if (type !== undefined) updateData.type = type;
  if (is_private !== undefined) updateData.is_private = is_private;

  await db('session_comments')
    .where('id', commentId)
    .update(updateData);

  // Get updated comment
  const updatedComment = await db('session_comments')
    .join('users', 'session_comments.user_id', 'users.id')
    .select(
      'session_comments.*',
      'users.username',
      'users.first_name',
      'users.last_name'
    )
    .where('session_comments.id', commentId)
    .first();

  res.json({
    success: true,
    message: 'Comment updated successfully',
    data: { comment: updatedComment }
  });
});

// @desc    Delete session comment
// @route   DELETE /api/v1/schedules/:id/sessions/:sessionId/comments/:commentId
// @access  Private (Admin, Owner, Comment Author)
const deleteSessionComment = asyncHandler(async (req, res) => {
  const { id, sessionId, commentId } = req.params;

  // Check if comment exists
  const existingComment = await db('session_comments')
    .where('id', commentId)
    .where('session_id', sessionId)
    .first();

  if (!existingComment) {
    return res.status(404).json({
      success: false,
      message: 'Comment not found'
    });
  }

  // Check permissions
  const schedule = await getScheduleWithDetails(id);
  const canDelete = req.user.role === 'owner' ||
    (req.user.role === 'admin' && schedule.branch_id === req.user.branch_id) ||
    existingComment.user_id === req.user.id;

  if (!canDelete) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only delete your own comments.'
    });
  }

  await db('session_comments').where('id', commentId).del();

  res.json({
    success: true,
    message: 'Comment deleted successfully'
  });
});

// @desc    Edit session details
// @route   PUT /api/v1/schedules/:id/sessions/:sessionId
// @access  Private (Admin, Owner)
const editSession = asyncHandler(async (req, res) => {
  const { id, sessionId } = req.params;
  const {
    session_date,
    start_time,
    end_time,
    teacher_id,
    room_id,
    status,
    notes
  } = req.body;

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

  // Check if session exists
  const session = await db('schedule_sessions')
    .where('id', sessionId)
    .where('schedule_id', id)
    .first();

  if (!session) {
    return res.status(404).json({
      success: false,
      message: 'Session not found in this schedule'
    });
  }

  // Check for conflicts if changing teacher, room, or time
  if (teacher_id || room_id || start_time || end_time || session_date) {
    const sessionDate = session_date || formatLocalDate(new Date(session.session_date));
    const dayOfWeek = new Date(sessionDate).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    const conflicts = await checkSessionConflicts(
      teacher_id || null,
      room_id || null,
      dayOfWeek,
      start_time || session.start_time,
      end_time || session.end_time,
      sessionDate,
      sessionId
    );

    if (conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Session conflicts detected',
        conflicts
      });
    }
  }

  // Prepare update data
  const updateData = { updated_at: new Date() };

  if (session_date !== undefined) updateData.session_date = session_date;
  if (start_time !== undefined) updateData.start_time = start_time;
  if (end_time !== undefined) updateData.end_time = end_time;
  if (status !== undefined) updateData.status = status;
  if (notes !== undefined) updateData.notes = notes;

  if (Object.keys(updateData).length === 1) { // Only updated_at
    return res.status(400).json({
      success: false,
      message: 'No valid fields to update'
    });
  }

  // Update session
  await db('schedule_sessions')
    .where('id', sessionId)
    .update(updateData);

  // Get updated session with details
  const updatedSession = await db('schedule_sessions')
    .leftJoin('schedule_time_slots', 'schedule_sessions.time_slot_id', 'schedule_time_slots.id')
    .leftJoin('schedules', 'schedule_sessions.schedule_id', 'schedules.id')
    .leftJoin('teachers', 'schedules.teacher_id', 'teachers.id')
    .leftJoin('rooms', 'schedules.room_id', 'rooms.id')
    .select(
      'schedule_sessions.*',
      'schedule_time_slots.day_of_week',
      'teachers.first_name as teacher_first_name',
      'teachers.last_name as teacher_last_name',
      'rooms.room_name'
    )
    .where('schedule_sessions.id', sessionId)
    .first();

  // Format dates in the response
  if (updatedSession) {
    if (updatedSession.session_date) {
      updatedSession.session_date = formatLocalDate(new Date(updatedSession.session_date));
    }
    if (updatedSession.created_at) {
      updatedSession.created_at = updatedSession.created_at.toISOString();
    }
    if (updatedSession.updated_at) {
      updatedSession.updated_at = updatedSession.updated_at.toISOString();
    }
  }

  // Add comment for the change if significant fields were updated
  const significantFields = ['session_date', 'start_time', 'end_time', 'status'];
  const changedFields = significantFields.filter(field => updateData[field] !== undefined);

  if (changedFields.length > 0) {
    await db('session_comments').insert({
      session_id: sessionId,
      user_id: req.user.id,
      comment: `Session updated - Changed: ${changedFields.join(', ')}`,
      type: 'important',
      is_private: false,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  res.json({
    success: true,
    message: 'Session updated successfully',
    data: {
      session: updatedSession,
      fields_changed: changedFields
    }
  });
});

// Helper function to check session conflicts
const checkSessionConflicts = async (teacherId, roomId, dayOfWeek, startTime, endTime, sessionDate, excludeSessionId = null) => {
  const conflicts = [];

  // Check teacher conflicts on the same date
  if (teacherId) {
    let teacherQuery = db('schedule_sessions')
      .join('schedules', 'schedule_sessions.schedule_id', 'schedules.id')
      .join('courses', 'schedules.course_id', 'courses.id')
      .leftJoin('rooms', 'schedules.room_id', 'rooms.id')
      .select(
        'schedule_sessions.*',
        'schedules.schedule_name',
        'courses.name as course_name',
        'rooms.room_name'
      )
      .where('schedules.teacher_id', teacherId)
      .where('schedule_sessions.session_date', sessionDate)
      .where('schedule_sessions.status', '!=', 'cancelled')
      .where(function () {
        this.where(function () {
          this.where('schedule_sessions.start_time', '<=', startTime)
            .where('schedule_sessions.end_time', '>', startTime);
        }).orWhere(function () {
          this.where('schedule_sessions.start_time', '<', endTime)
            .where('schedule_sessions.end_time', '>=', endTime);
        }).orWhere(function () {
          this.where('schedule_sessions.start_time', '>=', startTime)
            .where('schedule_sessions.end_time', '<=', endTime);
        });
      });

    if (excludeSessionId) {
      teacherQuery = teacherQuery.where('schedule_sessions.id', '!=', excludeSessionId);
    }

    const teacherConflicts = await teacherQuery;
    if (teacherConflicts.length > 0) {
      conflicts.push({
        type: 'teacher',
        message: 'Teacher has conflicting sessions on this date',
        conflicts: teacherConflicts
      });
    }
  }

  // Check room conflicts on the same date
  if (roomId) {
    let roomQuery = db('schedule_sessions')
      .join('schedules', 'schedule_sessions.schedule_id', 'schedules.id')
      .join('courses', 'schedules.course_id', 'courses.id')
      .leftJoin('teachers', 'schedules.teacher_id', 'teachers.id')
      .select(
        'schedule_sessions.*',
        'schedules.schedule_name',
        'courses.name as course_name',
        'teachers.first_name as teacher_first_name',
        'teachers.last_name as teacher_last_name'
      )
      .where('schedules.room_id', roomId)
      .where('schedule_sessions.session_date', sessionDate)
      .where('schedule_sessions.status', '!=', 'cancelled')
      .where(function () {
        this.where(function () {
          this.where('schedule_sessions.start_time', '<=', startTime)
            .where('schedule_sessions.end_time', '>', startTime);
        }).orWhere(function () {
          this.where('schedule_sessions.start_time', '<', endTime)
            .where('schedule_sessions.end_time', '>=', endTime);
        }).orWhere(function () {
          this.where('schedule_sessions.start_time', '>=', startTime)
            .where('schedule_sessions.end_time', '<=', endTime);
        });
      });

    if (excludeSessionId) {
      roomQuery = roomQuery.where('schedule_sessions.id', '!=', excludeSessionId);
    }

    const roomConflicts = await roomQuery;
    if (roomConflicts.length > 0) {
      conflicts.push({
        type: 'room',
        message: 'Room has conflicting sessions on this date',
        conflicts: roomConflicts
      });
    }
  }

  return conflicts;
};

// @desc    Create schedule exception by session ID
// @route   POST /api/v1/schedules/:id/exceptions/session
// @access  Private (Admin, Owner)
const createScheduleExceptionBySession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    session_id,
    exception_type = 'cancellation',
    new_date,
    new_start_time,
    new_end_time,
    new_teacher_id,
    new_room_id,
    reason,
    notes
  } = req.body;

  if (!session_id || !reason) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: session_id, reason'
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

  // Get the session details
  const session = await db('schedule_sessions')
    .where('id', session_id)
    .where('schedule_id', id)
    .first();

  if (!session) {
    return res.status(404).json({
      success: false,
      message: 'Session not found in this schedule'
    });
  }

  // Extract date from session_date
  const sessionDate = formatLocalDate(new Date(session.session_date));

  // Check if exception already exists for this date
  const existingException = await db('schedule_exceptions')
    .where('schedule_id', id)
    .where('exception_date', sessionDate)
    .first();

  if (existingException) {
    return res.status(400).json({
      success: false,
      message: `Exception already exists for session date: ${sessionDate}`
    });
  }

  const exceptionId = await db.transaction(async (trx) => {
    // Insert the exception
    const [insertedId] = await trx('schedule_exceptions').insert({
      schedule_id: id,
      exception_date: sessionDate,
      exception_type: exception_type || 'cancellation',
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

    // Update the specific session based on exception type
    if (exception_type === 'cancellation' || exception_type === '' || !exception_type) {
      // Cancel the specific session
      await trx('schedule_sessions')
        .where('id', session_id)
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          notes: `Cancelled: ${reason}`,
          updated_at: new Date()
        });

    } else if (exception_type === 'reschedule' && new_date) {
      // Reschedule the specific session
      const updateData = {
        session_date: new_date,
        notes: `Rescheduled from ${sessionDate}: ${reason}`,
        updated_at: new Date()
      };
      if (new_start_time) updateData.start_time = new_start_time;
      if (new_end_time) updateData.end_time = new_end_time;

      await trx('schedule_sessions')
        .where('id', session_id)
        .update(updateData);

    } else if (exception_type === 'teacher_change' && new_teacher_id) {
      // Change teacher for the specific session - Note: This will be ignored as teacher_id is now in schedules table
      // You should update the teacher in the schedules table instead
      return res.status(400).json({
        success: false,
        message: 'Teacher changes should be made at the schedule level, not session level'
      });

    } else if (exception_type === 'room_change' && new_room_id) {
      // Change room for the specific session - Note: This will be ignored as room_id is now in schedules table
      // You should update the room in the schedules table instead
      return res.status(400).json({
        success: false,
        message: 'Room changes should be made at the schedule level, not session level'
      });

    } else if (exception_type === 'time_change' && (new_start_time || new_end_time)) {
      // Change time for the specific session
      const updateData = {
        notes: `Time changed: ${reason}`,
        updated_at: new Date()
      };
      if (new_start_time) updateData.start_time = new_start_time;
      if (new_end_time) updateData.end_time = new_end_time;

      await trx('schedule_sessions')
        .where('id', session_id)
        .update(updateData);
    }

    return insertedId;
  });

  // Get the created exception with details
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

  // Get updated session details
  const updatedSession = await db('schedule_sessions')
    .leftJoin('schedule_time_slots', 'schedule_sessions.time_slot_id', 'schedule_time_slots.id')
    .leftJoin('schedules', 'schedule_sessions.schedule_id', 'schedules.id')
    .leftJoin('teachers', 'schedules.teacher_id', 'teachers.id')
    .leftJoin('rooms', 'schedules.room_id', 'rooms.id')
    .select(
      'schedule_sessions.*',
      'schedule_time_slots.day_of_week',
      'teachers.first_name as teacher_first_name',
      'teachers.last_name as teacher_last_name',
      'rooms.room_name'
    )
    .where('schedule_sessions.id', session_id)
    .first();

  // Format dates in the response
  if (updatedSession) {
    if (updatedSession.session_date) {
      updatedSession.session_date = formatLocalDate(new Date(updatedSession.session_date));
    }
    if (updatedSession.created_at) {
      updatedSession.created_at = updatedSession.created_at.toISOString();
    }
    if (updatedSession.updated_at) {
      updatedSession.updated_at = updatedSession.updated_at.toISOString();
    }
  }

  res.status(201).json({
    success: true,
    message: `Session ${exception_type === 'cancellation' ? 'cancelled' : 'updated'} successfully`,
    data: {
      exception,
      updated_session: updatedSession,
      original_session_date: sessionDate
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

  // Handle date properly - convert to local date format YYYY-MM-DD
  let exceptionDate;
  if (typeof exception_date === 'object' && exception_date !== null) {
    exceptionDate = exception_date.date || String(exception_date);
  } else {
    exceptionDate = String(exception_date);
  }

  // If the date includes time or timezone info, extract just the date part
  if (exceptionDate.includes('T')) {
    exceptionDate = exceptionDate.split('T')[0];
  }

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
    // Insert the exception with corrected data
    const [insertedId] = await trx('schedule_exceptions').insert({
      schedule_id: scheduleId,
      exception_date: exceptionDate, // Use the formatted date
      exception_type: exception_type || 'cancellation', // Default to cancellation if empty
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
    // If exception_type is empty or 'cancellation', treat as cancellation
    if (exception_type === 'cancellation' || exception_type === '' || !exception_type) {
      // Cancel sessions on this date - use DATE() function for comparison
      await trx.raw(`
        UPDATE schedule_sessions 
        SET 
          status = 'cancelled',
          cancellation_reason = ?,
          notes = ?,
          updated_at = NOW()
        WHERE 
          schedule_id = ? AND 
          DATE(session_date) = ?
      `, [reason, `Cancelled: ${reason}`, scheduleId, exceptionDate]);

    } else if (exception_type === 'reschedule' && new_date) {
      // Reschedule sessions to new date
      await trx.raw(`
        UPDATE schedule_sessions
        SET
          session_date = ?,
          start_time = COALESCE(?, start_time),
          end_time = COALESCE(?, end_time),
          notes = ?,
          updated_at = NOW()
        WHERE
          schedule_id = ? AND
          DATE(session_date) = ?
      `, [new_date, new_start_time, new_end_time, `Rescheduled from ${exceptionDate}: ${reason}`, scheduleId, exceptionDate]);

    } else if (exception_type === 'teacher_change' && new_teacher_id) {
      // Change teacher for sessions on this date - Note: This will be ignored as teacher_id is now in schedules table
      // You should update the teacher in the schedules table instead
      throw new Error('Teacher changes should be made at the schedule level, not session level');

    } else if (exception_type === 'room_change' && new_room_id) {
      // Change room for sessions on this date - Note: This will be ignored as room_id is now in schedules table
      // You should update the room in the schedules table instead
      throw new Error('Room changes should be made at the schedule level, not session level');

    } else if (exception_type === 'time_change' && (new_start_time || new_end_time)) {
      // Change time for sessions on this date
      await trx.raw(`
        UPDATE schedule_sessions
        SET
          start_time = COALESCE(?, start_time),
          end_time = COALESCE(?, end_time),
          notes = ?,
          updated_at = NOW()
        WHERE
          schedule_id = ? AND
          DATE(session_date) = ?
      `, [new_start_time, new_end_time, `Time changed: ${reason}`, scheduleId, exceptionDate]);
    }    return insertedId;
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
    .leftJoin('schedules', 'schedule_sessions.schedule_id', 'schedules.id')
    .leftJoin('teachers', 'schedules.teacher_id', 'teachers.id')
    .leftJoin('rooms', 'schedules.room_id', 'rooms.id')
    .select(
      'schedule_sessions.*',
      'schedule_time_slots.day_of_week',
      'teachers.first_name as teacher_first_name',
      'teachers.last_name as teacher_last_name',
      'rooms.room_name'
    )
    .where('schedule_sessions.id', makeupSessionId)
    .first();

  // Format dates in the response
  if (makeupSession) {
    if (makeupSession.session_date) {
      makeupSession.session_date = formatLocalDate(new Date(makeupSession.session_date));
    }
    if (makeupSession.created_at) {
      makeupSession.created_at = makeupSession.created_at.toISOString();
    }
    if (makeupSession.updated_at) {
      makeupSession.updated_at = makeupSession.updated_at.toISOString();
    }
  }

  // Format dates in original session
  if (originalSession) {
    if (originalSession.session_date) {
      originalSession.session_date = formatLocalDate(new Date(originalSession.session_date));
    }
    if (originalSession.created_at) {
      originalSession.created_at = originalSession.created_at.toISOString();
    }
    if (originalSession.updated_at) {
      originalSession.updated_at = originalSession.updated_at.toISOString();
    }
  }

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
  const {
    page = 1,
    limit = 20,
    status,
    start_date,
    end_date,
    teacher_id,
    room_id,
    sort_by = 'session_date',
    sort_order = 'asc'
  } = req.query;

  const offset = (page - 1) * limit;

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
  let query = db('schedule_sessions as makeup')
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
    .where('makeup.is_makeup_session', true);

  // Apply filters
  if (status) {
    query = query.where('makeup.status', status);
  }
  if (start_date) {
    query = query.where('makeup.session_date', '>=', start_date);
  }
  if (end_date) {
    query = query.where('makeup.session_date', '<=', end_date);
  }
  if (teacher_id) {
    query = query.where('makeup.teacher_id', teacher_id);
  }
  if (room_id) {
    query = query.where('makeup.room_id', room_id);
  }

  // Get total count for pagination
  const totalQuery = query.clone().count('* as total');
  const [{ total }] = await totalQuery;

  // Apply sorting and pagination
  const validSortFields = ['session_date', 'original_date', 'start_time', 'status', 'created_at'];
  const sortField = validSortFields.includes(sort_by) ? sort_by : 'session_date';
  const sortDir = sort_order.toLowerCase() === 'desc' ? 'desc' : 'asc';

  let orderByField = `makeup.${sortField}`;
  if (sortField === 'original_date') {
    orderByField = 'original.session_date';
  }

  const makeupSessions = await query
    .orderBy(orderByField, sortDir)
    .limit(parseInt(limit))
    .offset(parseInt(offset));

  // Format dates in makeup sessions
  const formattedMakeupSessions = makeupSessions.map(session => {
    if (session.session_date) {
      session.session_date = formatLocalDate(new Date(session.session_date));
    }
    if (session.original_date) {
      session.original_date = formatLocalDate(new Date(session.original_date));
    }
    if (session.created_at) {
      session.created_at = session.created_at.toISOString();
    }
    if (session.updated_at) {
      session.updated_at = session.updated_at.toISOString();
    }
    return session;
  });

  res.json({
    success: true,
    data: {
      schedule: {
        id: schedule.id,
        schedule_name: schedule.schedule_name,
        course_name: schedule.course_name
      },
      makeup_sessions: formattedMakeupSessions,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: parseInt(total),
        total_pages: Math.ceil(total / limit)
      }
    }
  });
});

// @desc    Get schedule sessions with detailed information
// @route   GET /api/v1/schedules/:id/sessions
// @access  Private
const getScheduleSessions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    status,
    start_date,
    end_date,
    include_cancelled = 'false',
    page = 1,
    limit = 20,
    sort_by = 'session_date',
    sort_order = 'asc',
    teacher_id,
    room_id,
    session_number,
    week_number,
    is_makeup_session,
    has_comments = null
  } = req.query;

  const offset = (page - 1) * limit;

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
    .leftJoin('users as teacher_users', 'teachers.user_id', 'teacher_users.id')
    .leftJoin('rooms', 'schedule_sessions.room_id', 'rooms.id')
    .select(
      'schedule_sessions.*',
      'schedule_time_slots.day_of_week',
      'teachers.first_name as teacher_first_name',
      'teachers.last_name as teacher_last_name',
      'teachers.nationality as teacher_nationality',
      'teachers.teacher_type as teacher_type',
      'teacher_users.phone as teacher_phone',
      'teacher_users.email as teacher_email',
      'rooms.room_name',
      'rooms.capacity as room_capacity'
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
  if (teacher_id) {
    query = query.where('schedule_sessions.teacher_id', teacher_id);
  }
  if (room_id) {
    query = query.where('schedule_sessions.room_id', room_id);
  }
  if (session_number) {
    query = query.where('schedule_sessions.session_number', session_number);
  }
  if (week_number) {
    query = query.where('schedule_sessions.week_number', week_number);
  }
  if (is_makeup_session !== undefined) {
    query = query.where('schedule_sessions.is_makeup_session', is_makeup_session === 'true');
  }
  if (include_cancelled !== 'true') {
    query = query.where('schedule_sessions.status', '!=', 'cancelled');
  }

  // Filter by sessions that have comments
  if (has_comments === 'true') {
    query = query.whereExists(function () {
      this.select('*')
        .from('session_comments')
        .whereRaw('session_comments.session_id = schedule_sessions.id');
    });
  } else if (has_comments === 'false') {
    query = query.whereNotExists(function () {
      this.select('*')
        .from('session_comments')
        .whereRaw('session_comments.session_id = schedule_sessions.id');
    });
  }

  // Get total count for pagination
  const totalQuery = query.clone().count('* as total');
  const [{ total }] = await totalQuery;

  // Apply sorting and pagination
  const validSortFields = ['session_date', 'session_number', 'week_number', 'start_time', 'end_time', 'status', 'created_at'];
  const sortField = validSortFields.includes(sort_by) ? sort_by : 'session_date';
  const sortDir = sort_order.toLowerCase() === 'desc' ? 'desc' : 'asc';

  let sessions = await query
    .orderBy(`schedule_sessions.${sortField}`, sortDir)
    .orderBy('schedule_sessions.start_time', 'asc') // Secondary sort by start_time
    .limit(parseInt(limit))
    .offset(parseInt(offset));

  // Format dates in sessions
  sessions = sessions.map(session => {
    if (session.session_date) {
      session.session_date = formatLocalDate(new Date(session.session_date));
    }
    if (session.created_at) {
      session.created_at = session.created_at.toISOString();
    }
    if (session.updated_at) {
      session.updated_at = session.updated_at.toISOString();
    }
    return session;
  });

  // Get students enrolled in this schedule with role-based filtering
  const students = await db('schedule_students')
    .join('students', 'schedule_students.student_id', 'students.id')
    .join('users', 'students.user_id', 'users.id')
    .select(
      'students.*',
      'users.email',
      'users.phone',
      'users.line_id',
      'schedule_students.enrollment_date',
      'schedule_students.status as enrollment_status',
      'schedule_students.total_amount',
      'schedule_students.notes as enrollment_notes'
    )
    .where('schedule_students.schedule_id', id)
    .where('schedule_students.status', 'active')
    .orderBy('students.first_name', 'asc');

  // Filter student data based on user role
  const filteredStudents = students.map(student => {
    if (req.user.role === 'owner' || req.user.role === 'admin') {
      // Admin and Owner see all student information
      return student;
    } else {
      // Teachers see limited information
      return {
        id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
        nickname: student.nickname,
        date_of_birth: student.date_of_birth,
        current_education: student.current_education,
        enrollment_date: student.enrollment_date,
        enrollment_status: student.enrollment_status
      };
    }
  });

  // Get comment counts for sessions
  const sessionIds = sessions.map(s => s.id);
  let commentCounts = {};

  if (sessionIds.length > 0) {
    const counts = await db('session_comments')
      .select('session_id')
      .count('id as comment_count')
      .whereIn('session_id', sessionIds)
      .groupBy('session_id');

    commentCounts = counts.reduce((acc, item) => {
      acc[item.session_id] = parseInt(item.comment_count);
      return acc;
    }, {});
  }

  // Get attendance data for sessions
  let attendanceData = {};
  if (sessionIds.length > 0) {
    const attendance = await db('student_attendances')
      .select('session_id', 'status')
      .count('id as count')
      .whereIn('session_id', sessionIds)
      .groupBy('session_id', 'status');

    attendance.forEach(item => {
      if (!attendanceData[item.session_id]) {
        attendanceData[item.session_id] = {};
      }
      attendanceData[item.session_id][item.status] = parseInt(item.count);
    });
  }

  // Filter teacher data based on user role
  sessions = sessions.map(session => {
    const teacherData = req.user.role === 'owner' || req.user.role === 'admin'
      ? {
        teacher_first_name: session.teacher_first_name,
        teacher_last_name: session.teacher_last_name,
        teacher_nationality: session.teacher_nationality,
        teacher_type: session.teacher_type,
        teacher_phone: session.teacher_phone,
        teacher_email: session.teacher_email
      }
      : {
        teacher_first_name: session.teacher_first_name,
        teacher_last_name: session.teacher_last_name,
        teacher_nationality: session.teacher_nationality,
        teacher_type: session.teacher_type
      };

    return {
      ...session,
      ...teacherData,
      comment_count: commentCounts[session.id] || 0,
      attendance_summary: attendanceData[session.id] || {}
    };
  });

  // Get related exceptions
  const exceptions = await db('schedule_exceptions')
    .leftJoin('teachers', 'schedule_exceptions.new_teacher_id', 'teachers.id')
    .leftJoin('rooms', 'schedule_exceptions.new_room_id', 'rooms.id')
    .select(
      'schedule_exceptions.*',
      'teachers.first_name as new_teacher_first_name',
      'teachers.last_name as new_teacher_last_name',
      'rooms.room_name as new_room_name'
    )
    .where('schedule_exceptions.schedule_id', id)
    .orderBy('exception_date', 'asc');

  res.json({
    success: true,
    data: {
      schedule: {
        id: schedule.id,
        schedule_name: schedule.schedule_name,
        course_name: schedule.course_name,
        course_code: schedule.course_code,
        branch_name: schedule.branch_name,
        total_hours: schedule.total_hours,
        hours_per_session: schedule.hours_per_session,
        max_students: schedule.max_students,
        current_students: filteredStudents.length,
        available_spots: schedule.max_students - filteredStudents.length,
        start_date: schedule.start_date,
        end_date: schedule.end_date,
        status: schedule.status,
        schedule_type: schedule.schedule_type,
        auto_reschedule_holidays: schedule.auto_reschedule_holidays
      },
      students: filteredStudents,
      sessions: sessions,
      exceptions: exceptions,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: parseInt(total),
        total_pages: Math.ceil(total / limit)
      },
      summary: {
        total_sessions: parseInt(total),
        scheduled: sessions.filter(s => s.status === 'scheduled').length,
        completed: sessions.filter(s => s.status === 'completed').length,
        cancelled: sessions.filter(s => s.status === 'cancelled').length,
        makeup_sessions: sessions.filter(s => s.is_makeup_session).length,
        total_exceptions: exceptions.length,
        total_enrolled_students: filteredStudents.length
      }
    }
  });
});

// @desc    Get weekly schedule view
// @route   GET /api/v1/schedules/weekly
// @access  Private
const getWeeklySchedule = asyncHandler(async (req, res) => {
  const {
    week_start,
    teacher_id,
    room_id,
    branch_id,
    status = 'active',
    course_id,
    min_students,
    max_students,
    include_students = 'false',
    time_range_start,
    time_range_end
  } = req.query;

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
      'branches.name_en as branch_name_en',
      'branches.name_th as branch_name_th',
    )
    .where('schedules.status', status);

  // Apply filters
  if (teacher_id) query = query.where('schedules.teacher_id', teacher_id);
  if (room_id) query = query.where('schedules.room_id', room_id);
  if (branch_id) query = query.where('courses.branch_id', branch_id);
  if (course_id) query = query.where('schedules.course_id', course_id);
  // Note: time_range_start/end filters removed as schedules no longer have single start_time/end_time
  // Time filtering should be done at the session level if needed

  // Branch permission check
  if (req.user.role !== 'owner') {
    query = query.where('courses.branch_id', req.user.branch_id);
  }

  const schedules = await query.orderBy('schedules.schedule_name', 'asc').orderBy('schedules.start_date', 'asc');

  // Format dates in schedules
  const formattedSchedules = schedules.map(schedule => {
    if (schedule.start_date) {
      schedule.start_date = formatLocalDate(new Date(schedule.start_date));
    }
    if (schedule.estimated_end_date) {
      schedule.estimated_end_date = formatLocalDate(new Date(schedule.estimated_end_date));
    }
    if (schedule.actual_end_date) {
      schedule.actual_end_date = formatLocalDate(new Date(schedule.actual_end_date));
    }
    if (schedule.created_at) {
      schedule.created_at = schedule.created_at.toISOString();
    }
    if (schedule.updated_at) {
      schedule.updated_at = schedule.updated_at.toISOString();
    }
    return schedule;
  });

  // Get student counts
  const scheduleIds = formattedSchedules.map(s => s.id);
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

  // Apply student count filters if specified
  let filteredSchedules = formattedSchedules;
  if (min_students || max_students) {
    filteredSchedules = schedules.filter(schedule => {
      const currentStudents = studentCounts[schedule.id] || 0;
      if (min_students && currentStudents < parseInt(min_students)) return false;
      if (max_students && currentStudents > parseInt(max_students)) return false;
      return true;
    });
  }

  // Get exceptions for the week if week_start is provided
  let exceptions = [];
  if (week_start) {
    const weekEnd = new Date(week_start);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const scheduleIds = formattedSchedules.map(s => s.id);
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
      .whereBetween('schedule_exceptions.exception_date', [week_start, formatLocalDate(weekEnd)])
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

  // Include student details if requested
  let studentDetails = {};
  if (include_students === 'true' && scheduleIds.length > 0) {
    const students = await db('schedule_students')
      .join('students', 'schedule_students.student_id', 'students.id')
      .join('users', 'students.user_id', 'users.id')
      .select(
        'schedule_students.schedule_id',
        'students.id as student_id',
        'students.first_name',
        'students.last_name',
        'students.nickname'
      )
      .whereIn('schedule_students.schedule_id', scheduleIds)
      .where('schedule_students.status', 'active')
      .orderBy('students.first_name', 'asc');

    // Group students by schedule
    students.forEach(student => {
      if (!studentDetails[student.schedule_id]) {
        studentDetails[student.schedule_id] = [];
      }
      studentDetails[student.schedule_id].push({
        id: student.student_id,
        first_name: student.first_name,
        last_name: student.last_name,
        nickname: student.nickname
      });
    });
  }

  filteredSchedules.forEach(schedule => {
    const scheduleWithCounts = {
      ...schedule,
      current_students: studentCounts[schedule.id] || 0,
      available_spots: schedule.max_students - (studentCounts[schedule.id] || 0),
      exceptions: exceptions.filter(ex => ex.schedule_id === schedule.id),
      students: include_students === 'true' ? (studentDetails[schedule.id] || []) : undefined
    };

    weeklySchedule[schedule.day_of_week].push(scheduleWithCounts);
  });

  res.json({
    success: true,
    data: {
      week_start: week_start || null,
      weekly_schedule: weeklySchedule,
      total_schedules: filteredSchedules.length,
      total_exceptions: exceptions.length,
      summary: {
        total_active_schedules: filteredSchedules.length,
        schedules_by_day: {
          monday: weeklySchedule.monday.length,
          tuesday: weeklySchedule.tuesday.length,
          wednesday: weeklySchedule.wednesday.length,
          thursday: weeklySchedule.thursday.length,
          friday: weeklySchedule.friday.length,
          saturday: weeklySchedule.saturday.length,
          sunday: weeklySchedule.sunday.length
        },
        total_students_enrolled: Object.values(studentCounts).reduce((sum, count) => sum + count, 0),
        average_class_size: filteredSchedules.length > 0
          ? (Object.values(studentCounts).reduce((sum, count) => sum + count, 0) / filteredSchedules.length).toFixed(2)
          : 0
      }
    }
  });
});

// @desc    Create a single or repeating session(s) for a schedule
// @route   POST /api/v1/schedules/:id/sessions/create
// @access  Private (Admin, Owner)
const createSessions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    session_date, // YYYY-MM-DD (base date)
    start_time,   // HH:mm:ss
    end_time,     // HH:mm:ss
  repeat = { enabled: false },
    is_makeup_session = false,
  notes,
  appointment_notes,
  service
  } = req.body;

  if (!session_date || !start_time || !end_time) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: session_date, start_time, end_time'
    });
  }

  // Load schedule and permission check
  const schedule = await getScheduleWithDetails(id);
  if (!schedule) {
    return res.status(404).json({ success: false, message: 'Schedule not found' });
  }
  if (req.user.role !== 'owner' && schedule.branch_id !== req.user.branch_id) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  // Helper to compute week number relative to schedule start
  const computeWeekNumber = (dateStr) => {
    try {
      const start = new Date(schedule.start_date + 'T00:00:00');
      const current = new Date(dateStr + 'T00:00:00');

      // Align both to Monday start-of-week (Mon=1 .. Sun=0 -> move to Monday)
      const toMonday = (d) => {
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day; // move to Monday
        const nd = new Date(d);
        nd.setDate(d.getDate() + diff);
        return nd;
      };

      const startMon = toMonday(start);
      const currentMon = toMonday(current);
      const daysDiff = Math.floor((currentMon - startMon) / (24 * 60 * 60 * 1000));
      return 1 + Math.floor(daysDiff / 7);
    } catch (_) {
      return null;
    }
  };

  // Build date candidates with advanced repeat (daily/weekly/monthly, interval, end conditions)
  const dates = [];
  const baseDate = new Date(session_date + 'T00:00:00');
  const baseDayName = baseDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

  const normRepeat = {
    enabled: !!(repeat && repeat.enabled),
    frequency: (repeat && repeat.frequency) || 'weekly',
    interval: Math.max(1, parseInt((repeat && repeat.interval) || 1)),
    end: repeat && repeat.end ? repeat.end : { type: repeat?.until_date || repeat?.count ? 'on_or_after_legacy' : 'never' },
    days_of_week: (repeat && repeat.days_of_week) || undefined
  };

  const addDays = (d, n) => { const nd = new Date(d); nd.setDate(nd.getDate() + n); return nd; };
  const addMonths = (d, n) => {
    const nd = new Date(d);
    const day = nd.getDate();
    nd.setMonth(nd.getMonth() + n);
    if (nd.getDate() !== day) nd.setDate(0);
    return nd;
  };

  if (!normRepeat.enabled) {
    dates.push(session_date);
  } else {
    // Validate end
    const endType = normRepeat.end?.type || 'never';
    if (!['never', 'after', 'on', 'on_or_after_legacy'].includes(endType)) {
      return res.status(400).json({ success: false, message: 'Invalid repeat.end.type' });
    }

    // Legacy support: until_date/count at root
    const legacyCount = repeat?.count ? parseInt(repeat.count) : undefined;
    const legacyUntil = repeat?.until_date ? new Date(repeat.until_date + 'T00:00:00') : undefined;

    const limitCount = endType === 'after' ? parseInt(normRepeat.end.count) : (legacyCount || Number.MAX_SAFE_INTEGER);
    const limitDate = endType === 'on'
      ? new Date(normRepeat.end.date + 'T00:00:00')
      : (legacyUntil || new Date(baseDate.getTime() + 365 * 24 * 60 * 60 * 1000));

    let produced = 0;
    const maxIterations = 2000; // guard

    if (normRepeat.frequency === 'daily') {
      let current = new Date(baseDate);
      for (let i = 0; i < maxIterations; i++) {
        dates.push(formatLocalDate(current));
        produced++;
        if (endType === 'after' && produced >= limitCount) break;
        const next = addDays(current, normRepeat.interval);
        if (endType !== 'never' && next > limitDate) break;
        current = next;
      }
    } else if (normRepeat.frequency === 'weekly') {
      const dowMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
      const wanted = (normRepeat.days_of_week && normRepeat.days_of_week.length)
        ? normRepeat.days_of_week.map(d => dowMap[String(d).toLowerCase()]).filter(v => v !== undefined)
        : [baseDate.getDay()];
      let weekStart = new Date(baseDate);
      // iterate weeks
      for (let i = 0; i < maxIterations; i++) {
        for (const wd of wanted.sort((a,b)=>a-b)) {
          const delta = wd - weekStart.getDay();
          const target = addDays(weekStart, delta >= 0 ? delta : delta + 7);
          if (target < baseDate) continue;
          if (endType !== 'never' && target > limitDate) { i = maxIterations; break; }
          dates.push(formatLocalDate(target));
          produced++;
          if (endType === 'after' && produced >= limitCount) { i = maxIterations; break; }
        }
        if (i >= maxIterations) break;
        weekStart = addDays(weekStart, 7 * normRepeat.interval);
      }
    } else if (normRepeat.frequency === 'monthly') {
      let current = new Date(baseDate);
      for (let i = 0; i < maxIterations; i++) {
        dates.push(formatLocalDate(current));
        produced++;
        if (endType === 'after' && produced >= limitCount) break;
        const next = addMonths(current, normRepeat.interval);
        if (endType !== 'never' && next > limitDate) break;
        current = next;
      }
    } else {
      // default weekly behavior if unknown
      dates.push(session_date);
    }
  }

  // Prepare checks
  const teacherId = schedule.teacher_id || null;
  const roomId = schedule.room_id || null;

  // Get next session_number
  const maxRow = await db('schedule_sessions')
    .where('schedule_id', id)
    .max('session_number as maxnum')
    .first();
  let nextSessionNumber = (maxRow && maxRow.maxnum) ? (parseInt(maxRow.maxnum) + 1) : 1;

  const toCreate = [];
  const skipped = [];

  // Normalize service fields
  let service_type = 'course';
  let service_course_id = null;
  let service_custom_text = null;
  if (service) {
    if (service.type === 'custom') {
      service_type = 'custom';
      service_custom_text = service.custom_text || null;
    } else if (service.type === 'course') {
      service_type = 'course';
      service_course_id = service.course_id || schedule.course_id || null;
    }
  } else {
    service_course_id = schedule.course_id || null;
  }

  for (const dateStr of dates) {
    const dayName = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // Duplicate check in DB (align with DB unique index without is_makeup_session)
    const duplicate = await db('schedule_sessions')
      .where({
        schedule_id: id,
        session_date: dateStr,
        start_time,
        end_time
      })
      .first();
    if (duplicate) {
      skipped.push({ date: dateStr, reason: 'duplicate' });
      continue;
    }

    // Conflict check (teacher/room) if available
    const conflicts = await checkSessionConflicts(
      teacherId,
      roomId,
      dayName,
      start_time,
      end_time,
      dateStr,
      null
    );
    if (conflicts.length > 0) {
      skipped.push({ date: dateStr, reason: 'conflict', details: conflicts });
      continue;
    }

    // Ensure a matching time_slot exists (create if not found)
    let timeSlot = await db('schedule_time_slots')
      .where({ schedule_id: id, day_of_week: dayName, start_time, end_time })
      .first();

    if (!timeSlot) {
      // Determine next slot_order
      const slotMax = await db('schedule_time_slots')
        .where({ schedule_id: id })
        .max('slot_order as max_order')
        .first();
      const nextOrder = (slotMax && slotMax.max_order) ? parseInt(slotMax.max_order) + 1 : 1;
      const [newSlotId] = await db('schedule_time_slots').insert({
        schedule_id: id,
        day_of_week: dayName,
        start_time,
        end_time,
        slot_order: nextOrder
      });
      timeSlot = { id: newSlotId };
    }

    toCreate.push({
      schedule_id: id,
      time_slot_id: timeSlot.id || null,
      session_date: dateStr,
      session_number: nextSessionNumber++,
      week_number: computeWeekNumber(dateStr),
      start_time,
      end_time,
      status: 'scheduled',
      is_makeup_session: !!is_makeup_session,
      notes: notes || appointment_notes || (repeat?.enabled ? 'Created by repeat' : 'Created manually'),
      created_by: req.user?.id || null,
      teacher_id: teacherId,
      room_id: roomId,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Insert
  let inserted = [];
  if (toCreate.length > 0) {
    await db.transaction(async trx => {
      const ids = await trx('schedule_sessions').insert(toCreate);
      // For MySQL, insert returns [firstId]; we cannot easily map all IDs without returning
    });
    inserted = toCreate.map(s => ({
      session_date: s.session_date,
      start_time: s.start_time,
      end_time: s.end_time,
      session_number: s.session_number,
      week_number: s.week_number,
      is_makeup_session: s.is_makeup_session
    }));
  }

  return res.status(201).json({
    success: true,
    message: `Created ${inserted.length} session(s), skipped ${skipped.length}`,
    data: {
      created: inserted,
      skipped
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
      'branches.name_en as branch_name_en',
      'branches.name_th as branch_name_th',
    )
    .where('schedules.id', scheduleId)
    .first();

  if (schedule) {
    // Format dates as strings to prevent timezone conversion
    if (schedule.start_date) {
      schedule.start_date = formatLocalDate(new Date(schedule.start_date));
    }
    if (schedule.estimated_end_date) {
      schedule.estimated_end_date = formatLocalDate(new Date(schedule.estimated_end_date));
    }
    if (schedule.actual_end_date) {
      schedule.actual_end_date = formatLocalDate(new Date(schedule.actual_end_date));
    }
    if (schedule.created_at) {
      schedule.created_at = schedule.created_at.toISOString();
    }
    if (schedule.updated_at) {
      schedule.updated_at = schedule.updated_at.toISOString();
    }

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

  // Since schedules now have multiple time slots, we need to check conflicts differently
  // For now, return empty conflicts array to avoid the database error
  // TODO: Implement proper conflict checking for the new schema

  return conflicts;
};

// @desc    Apply existing exceptions to sessions (utility function)
// @route   POST /api/v1/schedules/:id/apply-exceptions
// @access  Private (Admin, Owner)
const applyExistingExceptions = asyncHandler(async (req, res) => {
  const { id } = req.params;

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

  // Get all approved exceptions for this schedule
  const exceptions = await db('schedule_exceptions')
    .where('schedule_id', id)
    .where('status', 'approved');

  if (exceptions.length === 0) {
    return res.json({
      success: true,
      message: 'No exceptions found to apply',
      data: { exceptions_applied: 0 }
    });
  }

  let appliedCount = 0;

  await db.transaction(async (trx) => {
    for (const exception of exceptions) {
      const { exception_date, exception_type, new_date, new_start_time, new_end_time, new_teacher_id, new_room_id, reason } = exception;

      // Convert exception date to proper format for comparison
      let exceptionDateFormatted = exception_date;
      if (typeof exception_date === 'string' && exception_date.includes('T')) {
        exceptionDateFormatted = exception_date.split('T')[0];
      }

      // Apply each exception type
      if (exception_type === 'cancellation' || exception_type === '' || !exception_type) {
        // Cancel sessions on this date - use DATE() function for comparison
        const updatedRows = await trx.raw(`
          UPDATE schedule_sessions 
          SET 
            status = 'cancelled',
            cancellation_reason = ?,
            notes = ?,
            updated_at = NOW()
          WHERE 
            schedule_id = ? AND 
            DATE(session_date) = ? AND 
            status != 'cancelled'
        `, [reason, `Cancelled: ${reason}`, id, exceptionDateFormatted]);

        if (updatedRows[0].affectedRows > 0) appliedCount++;

      } else if (exception_type === 'reschedule' && new_date) {
        // Reschedule sessions to new date
        const updatedRows = await trx.raw(`
          UPDATE schedule_sessions 
          SET 
            session_date = ?,
            start_time = COALESCE(?, start_time),
            end_time = COALESCE(?, end_time),
            teacher_id = COALESCE(?, teacher_id),
            room_id = COALESCE(?, room_id),
            notes = ?,
            updated_at = NOW()
          WHERE 
            schedule_id = ? AND 
            DATE(session_date) = ?
        `, [new_date, new_start_time, new_end_time, new_teacher_id, new_room_id, `Rescheduled from ${exceptionDateFormatted}: ${reason}`, id, exceptionDateFormatted]);

        if (updatedRows[0].affectedRows > 0) appliedCount++;

      } else if (exception_type === 'teacher_change' && new_teacher_id) {
        // Change teacher for sessions on this date
        const updatedRows = await trx.raw(`
          UPDATE schedule_sessions 
          SET 
            teacher_id = ?,
            notes = ?,
            updated_at = NOW()
          WHERE 
            schedule_id = ? AND 
            DATE(session_date) = ?
        `, [new_teacher_id, `Teacher changed: ${reason}`, id, exceptionDateFormatted]);

        if (updatedRows[0].affectedRows > 0) appliedCount++;

      } else if (exception_type === 'room_change' && new_room_id) {
        // Change room for sessions on this date
        const updatedRows = await trx.raw(`
          UPDATE schedule_sessions 
          SET 
            room_id = ?,
            notes = ?,
            updated_at = NOW()
          WHERE 
            schedule_id = ? AND 
            DATE(session_date) = ?
        `, [new_room_id, `Room changed: ${reason}`, id, exceptionDateFormatted]);

        if (updatedRows[0].affectedRows > 0) appliedCount++;

      } else if (exception_type === 'time_change' && (new_start_time || new_end_time)) {
        // Change time for sessions on this date
        const updatedRows = await trx.raw(`
          UPDATE schedule_sessions 
          SET 
            start_time = COALESCE(?, start_time),
            end_time = COALESCE(?, end_time),
            notes = ?,
            updated_at = NOW()
          WHERE 
            schedule_id = ? AND 
            DATE(session_date) = ?
        `, [new_start_time, new_end_time, `Time changed: ${reason}`, id, exceptionDateFormatted]);

        if (updatedRows[0].affectedRows > 0) appliedCount++;
      }
    }
  });

  res.json({
    success: true,
    message: `Applied ${appliedCount} exceptions to schedule sessions`,
    data: {
      total_exceptions: exceptions.length,
      exceptions_applied: appliedCount
    }
  });
});

// @desc    Get all schedules by day/week/month with holidays
// @route   GET /api/v1/schedules/calendar
// @access  Private
const getScheduleCalendar = asyncHandler(async (req, res) => {
  const {
    view = 'week', // 'day', 'week', 'month'
    date, // YYYY-MM-DD (required) - วันที่ใดก็ได้ที่ต้องการดู ไม่จำเป็นต้องเป็นปัจจุบัน
    branch_id,
    teacher_id,
    room_id,
    course_id,
    status = 'active',
    include_students = 'false',
    include_holidays = 'true'
  } = req.query;

  if (!date) {
    return res.status(400).json({
      success: false,
      message: 'Date parameter is required (YYYY-MM-DD format)'
    });
  }

  const targetDate = new Date(date);
  let startDate, endDate;

  // Calculate date range based on view
  switch (view) {
    case 'day':
      startDate = new Date(targetDate);
      endDate = new Date(targetDate);
      break;
    case 'week':
      // Start from Monday of the week
      startDate = new Date(targetDate);
      const dayOfWeek = startDate.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startDate.setDate(startDate.getDate() - daysFromMonday);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      break;
    case 'month':
      startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
      break;
    default:
      return res.status(400).json({
        success: false,
        message: 'Invalid view parameter. Use: day, week, or month'
      });
  }

  const startDateStr = formatLocalDate(startDate);
  const endDateStr = formatLocalDate(endDate);

  // Get all sessions within date range
  let sessionQuery = db('schedule_sessions')
    .join('schedules', 'schedule_sessions.schedule_id', 'schedules.id')
    .join('courses', 'schedules.course_id', 'courses.id')
    .join('branches', 'courses.branch_id', 'branches.id')
    .leftJoin('teachers', 'schedule_sessions.teacher_id', 'teachers.id')
    .leftJoin('users as teacher_users', 'teachers.user_id', 'teacher_users.id')
    .leftJoin('rooms', 'schedule_sessions.room_id', 'rooms.id')
    .leftJoin('schedule_time_slots', 'schedule_sessions.time_slot_id', 'schedule_time_slots.id')
    .select(
      'schedule_sessions.*',
      'schedules.schedule_name',
      'courses.name as course_name',
      'courses.code as course_code',
      'branches.id as branch_id',
      'branches.name_en as branch_name_en',
      'branches.name_th as branch_name_th',
      'teachers.user_id as teacher_user_id',
      'teachers.first_name as teacher_first_name',
      'teachers.last_name as teacher_last_name',
      'teachers.nationality as teacher_nationality',
      'teachers.teacher_type as teacher_type',
      'teacher_users.phone as teacher_phone',
      'teacher_users.email as teacher_email',
      'rooms.room_name',
      'rooms.capacity as room_capacity',
      'schedule_time_slots.day_of_week'
    )
    .whereBetween('schedule_sessions.session_date', [startDateStr, endDateStr])
    .where('schedules.status', status);

  // Apply filters
  if (branch_id) sessionQuery = sessionQuery.where('branches.id', branch_id);
  if (teacher_id) sessionQuery = sessionQuery.where('schedule_sessions.teacher_id', teacher_id);
  if (room_id) sessionQuery = sessionQuery.where('schedule_sessions.room_id', room_id);
  if (course_id) sessionQuery = sessionQuery.where('schedules.course_id', course_id);

  // Branch permission check
  if (req.user.role !== 'owner') {
    sessionQuery = sessionQuery.where('branches.id', req.user.branch_id);
  }

  let sessions = await sessionQuery
    .orderBy('schedule_sessions.session_date', 'asc')
    .orderBy('schedule_sessions.start_time', 'asc');

  // Format dates in sessions
  sessions = sessions.map(session => {
    if (session.session_date) {
      session.session_date = formatLocalDate(new Date(session.session_date));
    }
    if (session.created_at) {
      session.created_at = session.created_at.toISOString();
    }
    if (session.updated_at) {
      session.updated_at = session.updated_at.toISOString();
    }
    return session;
  });

  // Filter sessions to essential fields for calendar view  
  sessions = sessions.map(session => {
    const cleanSession = {
      id: session.id,
      schedule_id: session.schedule_id,
      schedule_name: session.schedule_name,
      course_name: session.course_name,
      course_code: session.course_code,
      session_date: session.session_date,
      start_time: session.start_time,
      end_time: session.end_time,
      status: session.status,
      room_name: session.room_name,
      teacher_id: session.teacher_id, // เพิ่ม teacher id
      teacher_name: session.teacher_first_name && session.teacher_last_name 
      ? `${session.teacher_first_name} ${session.teacher_last_name}` 
      : null,
      branch_name: session.branch_name_en
    };

    // Only include sensitive teacher data for admin/owner
    if (req.user.role === 'owner' || req.user.role === 'admin') {
      cleanSession.teacher_phone = session.teacher_phone;
      cleanSession.teacher_email = session.teacher_email;
    }

    return cleanSession;
  });

  // Get student information if requested (minimal data for performance)
  let studentsData = {};
  if (include_students === 'true') {
    const scheduleIds = [...new Set(sessions.map(s => s.schedule_id))];

    if (scheduleIds.length > 0) {
      const students = await db('schedule_students')
        .join('students', 'schedule_students.student_id', 'students.id')
        .select(
          'schedule_students.schedule_id',
          'students.id',
          'students.first_name',
          'students.last_name', 
          'students.nickname',
          'students.cefr_level'
        )
        .whereIn('schedule_students.schedule_id', scheduleIds)
        .where('schedule_students.status', 'active')
        .orderBy('students.first_name', 'asc');

      // Group students by schedule with minimal data
      students.forEach(student => {
        if (!studentsData[student.schedule_id]) {
          studentsData[student.schedule_id] = [];
        }
        studentsData[student.schedule_id].push({
          id: student.id,
          name: student.nickname || `${student.first_name} ${student.last_name}`,
          level: student.cefr_level
        });
      });
    }
  }

  // Get holidays if requested
  let holidays = [];
  if (include_holidays === 'true') {
    const years = [];
    const startYear = startDate.getFullYear() + 543; // Convert to Buddhist year
    const endYear = endDate.getFullYear() + 543;

    for (let year = startYear; year <= endYear; year++) {
      years.push(year);
    }

    holidays = await getHolidays(years);
    // Filter holidays within date range
    holidays = holidays.filter(holiday => {
      return holiday.date >= startDateStr && holiday.date <= endDateStr;
    });
  }

  // Get exceptions for the period
  const scheduleIds = [...new Set(sessions.map(s => s.schedule_id))];
  let exceptions = [];

  if (scheduleIds.length > 0) {
    exceptions = await db('schedule_exceptions')
      .leftJoin('teachers', 'schedule_exceptions.new_teacher_id', 'teachers.id')
      .leftJoin('rooms', 'schedule_exceptions.new_room_id', 'rooms.id')
      .select(
        'schedule_exceptions.*',
        'teachers.user_id as new_teacher_user_id',
        'teachers.first_name as new_teacher_first_name',
        'teachers.last_name as new_teacher_last_name',
        'rooms.room_name as new_room_name'
      )
      .whereIn('schedule_exceptions.schedule_id', scheduleIds)
      .whereBetween('schedule_exceptions.exception_date', [startDateStr, endDateStr])
      .where('schedule_exceptions.status', 'approved')
      .orderBy('exception_date', 'asc');
  }

  // Organize data by date
  const calendar = {};
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateStr = formatLocalDate(currentDate);
    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // Find holiday for this date
    const holidayInfo = holidays.find(h => h.date === dateStr);

    // Find sessions for this date
    const daySessions = sessions.filter(s =>
      formatLocalDate(new Date(s.session_date)) === dateStr
    );

    // Find exceptions for this date
    const dayExceptions = exceptions.filter(e => e.exception_date === dateStr);

    // Add student data to sessions if requested
    if (include_students === 'true') {
      daySessions.forEach(session => {
        session.students = studentsData[session.schedule_id] || [];
      });
    }

    calendar[dateStr] = {
      date: dateStr,
      day_of_week: dayName,
      is_holiday: !!holidayInfo,
      holiday_info: holidayInfo || null,
      sessions: daySessions,
      exceptions: dayExceptions,
      session_count: daySessions.length,
      branch_distribution: daySessions.reduce((acc, session) => {
        const branchName = session.branch_name || 'Unknown Branch';
        acc[branchName] = (acc[branchName] || 0) + 1;
        return acc;
      }, {})
    };

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Calculate summary statistics
  const totalSessions = sessions.length;
  const totalHolidays = holidays.length;
  const totalExceptions = exceptions.length;
  
  // Fix branch stats with proper name extraction
  const branchStats = sessions.reduce((acc, session) => {
    const branchName = session.branch_name || 'Unknown Branch';
    acc[branchName] = (acc[branchName] || 0) + 1;
    return acc;
  }, {});

  const teacherStats = sessions.reduce((acc, session) => {
    const teacherName = session.teacher_name || 'Unassigned';
    acc[teacherName] = (acc[teacherName] || 0) + 1;
    return acc;
  }, {});

  res.json({
    success: true,
    data: {
      view: view,
      period: {
        start_date: startDateStr,
        end_date: endDateStr,
        total_days: Object.keys(calendar).length
      },
      calendar: calendar,
      holidays: holidays,
      summary: {
        total_sessions: totalSessions,
        total_holidays: totalHolidays,
        total_exceptions: totalExceptions,
        sessions_by_status: {
          scheduled: sessions.filter(s => s.status === 'scheduled').length,
          completed: sessions.filter(s => s.status === 'completed').length,
          cancelled: sessions.filter(s => s.status === 'cancelled').length
        },
        sessions_by_branch: branchStats,
        sessions_by_teacher: teacherStats,
        days_with_sessions: Object.values(calendar).filter(day => day.session_count > 0).length,
        days_with_holidays: Object.values(calendar).filter(day => day.is_holiday).length
      }
    }
  });
});

// @desc    Get teacher schedules - all teachers or specific teacher
// @route   GET /api/v1/schedules/teachers
// @access  Private
const getTeacherSchedules = asyncHandler(async (req, res) => {
  const {
    teacher_id,
    branch_id,
    page = 1,
    limit = 50
  } = req.query;

  // Normalize potentially repeated query params
  const rawDateFilter = req.query.date_filter ?? 'week';
  const dateFilter = Array.isArray(rawDateFilter) ? (rawDateFilter[0] || 'week') : rawDateFilter;

  const rawDate = req.query.date ?? formatLocalDate(new Date());
  const dateStr = Array.isArray(rawDate) ? (rawDate[0] || formatLocalDate(new Date())) : rawDate;

  const offset = (page - 1) * limit;

  // Calculate date range based on filter
  let startDate, endDate;
  const filterDate = new Date(dateStr);

  switch (dateFilter) {
    case 'day':
      startDate = endDate = dateStr;
      break;
    case 'week':
      // Get start of week (Monday)
      const startOfWeek = new Date(filterDate);
      startOfWeek.setDate(filterDate.getDate() - (filterDate.getDay() === 0 ? 6 : filterDate.getDay() - 1));
      startDate = formatLocalDate(startOfWeek);

      // Get end of week (Sunday)
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endDate = formatLocalDate(endOfWeek);
      break;
    case 'month':
      // Get start of month
      const startOfMonth = new Date(filterDate.getFullYear(), filterDate.getMonth(), 1);
      startDate = formatLocalDate(startOfMonth);

      // Get end of month
      const endOfMonth = new Date(filterDate.getFullYear(), filterDate.getMonth() + 1, 0);
      endDate = formatLocalDate(endOfMonth);
      break;
    default:
      return res.status(400).json({
        success: false,
        message: 'Invalid date_filter. Use: day, week, or month'
      });
  }

  // Get all teachers based on filters
  let teachersQuery = db('teachers')
    .join('users as teacher_users', 'teachers.user_id', 'teacher_users.id')
    .select(
      'teachers.id as teacher_id',
      'teachers.first_name',
      'teachers.last_name',
      'teachers.nickname',
      'teacher_users.avatar'
    )
    .where('teacher_users.status', 'active');

  if (teacher_id) {
    teachersQuery = teachersQuery.where('teachers.id', teacher_id);
  }

  if (branch_id) {
    teachersQuery = teachersQuery.where('teacher_users.branch_id', branch_id);
  }

  // Branch permission check for non-owners
  if (req.user.role !== 'owner') {
    teachersQuery = teachersQuery.where('teacher_users.branch_id', req.user.branch_id);
  }

  const allTeachers = await teachersQuery;

  // Build base query for schedule sessions with teacher details
  let query = db('schedule_sessions')
    .join('schedules', 'schedule_sessions.schedule_id', 'schedules.id')
    .join('courses', 'schedules.course_id', 'courses.id')
    .leftJoin('teachers', 'schedule_sessions.teacher_id', 'teachers.id')
    .leftJoin('users as teacher_users', 'teachers.user_id', 'teacher_users.id')
    .leftJoin('rooms', 'schedule_sessions.room_id', 'rooms.id')
    .leftJoin('branches', 'courses.branch_id', 'branches.id')
    .select(
      'schedule_sessions.*',
      'schedules.schedule_name',
      'schedules.max_students',
      'schedules.current_students',
      'courses.name as course_name',
      'courses.code as course_code',
      'teachers.id as teacher_id',
      'teachers.first_name as teacher_first_name',
      'teachers.last_name as teacher_last_name',
      'teachers.nickname as teacher_nickname',
      'teacher_users.avatar as teacher_avatar',
      'rooms.room_name',
      'branches.id as branch_id',
      'branches.name_en as branch_name_en',
      'branches.name_th as branch_name_th'
    )
    .whereRaw('DATE(schedule_sessions.session_date) BETWEEN ? AND ?', [startDate, endDate])
    .whereIn('schedule_sessions.status', ['scheduled', 'confirmed', 'in_progress']);

  // Apply filters
  if (teacher_id) {
    query = query.where('schedule_sessions.teacher_id', teacher_id);
  }

  if (branch_id) {
    query = query.where('courses.branch_id', branch_id);
  }

  // Branch permission check for non-owners
  if (req.user.role !== 'owner') {
    query = query.where('courses.branch_id', req.user.branch_id);
  }

  // Get all sessions (without pagination)
  const sessions = await query
    .orderBy('schedule_sessions.session_date', 'asc')
    .orderBy('schedule_sessions.start_time', 'asc');

  // Format dates in sessions
  const formattedSessions = sessions.map(session => {
    if (session.session_date) {
      session.session_date = formatLocalDate(new Date(session.session_date));
    }
    if (session.created_at) {
      session.created_at = session.created_at.toISOString();
    }
    if (session.updated_at) {
      session.updated_at = session.updated_at.toISOString();
    }
    return session;
  });

  // Group sessions by teacher for better organization
  const groupedByTeacher = formattedSessions.reduce((acc, session) => {
    const teacherKey = session.teacher_id || 'unassigned';

    if (!acc[teacherKey]) {
      acc[teacherKey] = {
        teacher_id: session.teacher_id,
        teacher_name: session.teacher_first_name && session.teacher_last_name
          ? `${session.teacher_first_name} ${session.teacher_last_name}`
          : 'Unassigned',
        teacher_nickname: session.teacher_nickname,
        teacher_avatar: session.teacher_avatar,
        sessions: []
      };
    }

    acc[teacherKey].sessions.push({
      session_id: session.id,
      schedule_id: session.schedule_id,
      schedule_name: session.schedule_name,
      course_name: session.course_name,
      course_code: session.course_code,
      session_date: session.session_date,
      start_time: session.start_time,
      end_time: session.end_time,
      session_number: session.session_number,
      week_number: session.week_number,
      status: session.status,
      room_name: session.room_name,
      max_students: session.max_students,
      current_students: session.current_students,
      branch_id: session.branch_id,
      branch_name_en: session.branch_name_en,
      branch_name_th: session.branch_name_th,
      notes: session.notes
    });

    return acc;
  }, {});

  // Add teachers without sessions
  allTeachers.forEach(teacher => {
    const teacherKey = teacher.teacher_id;
    if (!groupedByTeacher[teacherKey]) {
      groupedByTeacher[teacherKey] = {
        teacher_id: teacher.teacher_id,
        teacher_name: teacher.first_name && teacher.last_name
          ? `${teacher.first_name} ${teacher.last_name}`
          : 'Unassigned',
        teacher_nickname: teacher.nickname,
        teacher_avatar: teacher.avatar,
        sessions: []
      };
    }
  });

  // Convert to array and sort by teacher name
  let teacherSchedules = Object.values(groupedByTeacher).sort((a, b) => {
    if (a.teacher_name === 'Unassigned') return 1;
    if (b.teacher_name === 'Unassigned') return -1;
    return a.teacher_name.localeCompare(b.teacher_name);
  });

  // Apply pagination to teachers
  const totalTeachers = teacherSchedules.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  teacherSchedules = teacherSchedules.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: {
      teachers: teacherSchedules,
      filter_info: {
  date_filter: dateFilter,
        start_date: startDate,
        end_date: endDate,
        total_sessions: formattedSessions.length
      },
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: totalTeachers,
        total_pages: Math.ceil(totalTeachers / limit)
      }
    }
  });
});

// @desc    Get specific teacher's schedule
// @route   GET /api/v1/schedules/teachers/:teacher_id
// @access  Private
const getTeacherSchedule = asyncHandler(async (req, res) => {
  const { teacher_id } = req.params;
  const {
    branch_id,
    include_students = 'false',
    page = 1,
    limit = 50
  } = req.query;

  // Normalize potentially repeated query params
  const rawDateFilter = req.query.date_filter ?? 'week';
  const dateFilter = Array.isArray(rawDateFilter) ? (rawDateFilter[0] || 'week') : rawDateFilter;

  const rawDate = req.query.date ?? formatLocalDate(new Date());
  const dateStr = Array.isArray(rawDate) ? (rawDate[0] || formatLocalDate(new Date())) : rawDate;

  const offset = (page - 1) * limit;

  // Check if teacher exists
  const teacher = await db('teachers')
    .join('users', 'teachers.user_id', 'users.id')
    .select(
      'teachers.*',
      'users.avatar',
      'users.branch_id',
      'users.email',
      'users.phone'
    )
    .where('teachers.id', teacher_id)
    .first();

  if (!teacher) {
    return res.status(404).json({
      success: false,
      message: 'Teacher not found'
    });
  }

  // Check permissions
  if (req.user.role !== 'owner' && teacher.branch_id !== req.user.branch_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Cannot access other branch teacher data.'
    });
  }

  // Calculate date range
  let startDate, endDate;
  const filterDate = new Date(dateStr);

  switch (dateFilter) {
    case 'day':
      startDate = endDate = dateStr;
      break;
    case 'week':
      const startOfWeek = new Date(filterDate);
      startOfWeek.setDate(filterDate.getDate() - (filterDate.getDay() === 0 ? 6 : filterDate.getDay() - 1));
      startDate = formatLocalDate(startOfWeek);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endDate = formatLocalDate(endOfWeek);
      break;
    case 'month':
      const startOfMonth = new Date(filterDate.getFullYear(), filterDate.getMonth(), 1);
      startDate = formatLocalDate(startOfMonth);

      const endOfMonth = new Date(filterDate.getFullYear(), filterDate.getMonth() + 1, 0);
      endDate = formatLocalDate(endOfMonth);
      break;
    default:
      return res.status(400).json({
        success: false,
        message: 'Invalid date_filter. Use: day, week, or month'
      });
  }

  // Get teacher's sessions
  let query = db('schedule_sessions')
    .join('schedules', 'schedule_sessions.schedule_id', 'schedules.id')
    .join('courses', 'schedules.course_id', 'courses.id')
    .leftJoin('rooms', 'schedule_sessions.room_id', 'rooms.id')
    .leftJoin('branches', 'courses.branch_id', 'branches.id')
    .select(
      'schedule_sessions.*',
      'schedules.schedule_name',
      'schedules.max_students',
      'schedules.current_students',
      'courses.name as course_name',
      'courses.code as course_code',
      'rooms.room_name',
      'branches.id as branch_id',
      'branches.name_en as branch_name_en',
      'branches.name_th as branch_name_th'
    )
    .where('schedule_sessions.teacher_id', teacher_id)
    .whereBetween('schedule_sessions.session_date', [startDate, endDate]);

  // Apply branch filter if specified
  if (branch_id) {
    query = query.where('courses.branch_id', branch_id);
  }

  // Branch permission check for non-owners
  if (req.user.role !== 'owner') {
    query = query.where('courses.branch_id', req.user.branch_id);
  }

  // Get total count
  const totalQuery = query.clone().count('* as total');
  const [{ total }] = await totalQuery;

  // Get paginated sessions
  const sessions = await query
    .orderBy('schedule_sessions.session_date', 'asc')
    .orderBy('schedule_sessions.start_time', 'asc')
    .limit(parseInt(limit))
    .offset(parseInt(offset));

  // Format dates in sessions
  const formattedSessions = sessions.map(session => {
    if (session.session_date) {
      session.session_date = formatLocalDate(new Date(session.session_date));
    }
    if (session.created_at) {
      session.created_at = session.created_at.toISOString();
    }
    if (session.updated_at) {
      session.updated_at = session.updated_at.toISOString();
    }
    return session;
  });

  // Include student information if requested
  let sessionsWithStudents = formattedSessions;
  if (include_students === 'true') {
    const sessionIds = formattedSessions.map(s => s.id);

    if (sessionIds.length > 0) {
      // Get students for each session via schedule_students
      const students = await db('schedule_students')
        .join('students', 'schedule_students.student_id', 'students.id')
        .join('users', 'students.user_id', 'users.id')
        .select(
          'schedule_students.schedule_id',
          'students.id as student_id',
          'students.first_name',
          'students.last_name',
          'students.nickname',
          'students.cefr_level',
          'users.avatar as student_avatar'
        )
        .whereIn('schedule_students.schedule_id', sessions.map(s => s.schedule_id))
        .where('schedule_students.status', 'active');

      // Group students by schedule_id
      const studentsBySchedule = students.reduce((acc, student) => {
        if (!acc[student.schedule_id]) {
          acc[student.schedule_id] = [];
        }
        acc[student.schedule_id].push({
          student_id: student.student_id,
          first_name: student.first_name,
          last_name: student.last_name,
          nickname: student.nickname,
          cefr_level: student.cefr_level,
          avatar: student.student_avatar
        });
        return acc;
      }, {});

      // Add students to sessions
      sessionsWithStudents = sessions.map(session => ({
        ...session,
        students: studentsBySchedule[session.schedule_id] || []
      }));
    }
  }

  // Group sessions by date for better organization
  const sessionsByDate = sessionsWithStudents.reduce((acc, session) => {
    const dateKey = formatLocalDate(new Date(session.session_date));

    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }

    acc[dateKey].push({
      session_id: session.id,
      schedule_id: session.schedule_id,
      schedule_name: session.schedule_name,
      course_name: session.course_name,
      course_code: session.course_code,
      start_time: session.start_time,
      end_time: session.end_time,
      session_number: session.session_number,
      week_number: session.week_number,
      status: session.status,
      room_name: session.room_name,
      max_students: session.max_students,
      current_students: session.current_students,
      branch_id: session.branch_id,
      branch_name_en: session.branch_name_en,
      branch_name_th: session.branch_name_th,
      notes: session.notes,
      students: session.students || []
    });

    return acc;
  }, {});

  res.json({
    success: true,
    data: {
      teacher: {
        id: teacher.id,
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        nickname: teacher.nickname,
        avatar: teacher.avatar,
        teacher_type: teacher.teacher_type,
        specializations: teacher.specializations ? JSON.parse(teacher.specializations) : [],
        branch_id: teacher.branch_id,
        email: teacher.email,
        phone: teacher.phone
      },
      sessions_by_date: sessionsByDate,
      filter_info: {
        date_filter: dateFilter,
        start_date: startDate,
        end_date: endDate,
        total_sessions: parseInt(total)
      },
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: parseInt(total),
        total_pages: Math.ceil(total / limit)
      }
    }
  });
});


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
  createScheduleExceptionBySession,
  createMakeupSession,
  getMakeupSessions,
  handleStudentLeave,
  handleCourseDrop,
  getScheduleSessions,
  getWeeklySchedule,
  getScheduleCalendar,
  applyExistingExceptions,
  addSessionComment,
  getSessionComments,
  updateSessionComment,
  deleteSessionComment,
  editSession,
  getTeacherSchedules,
  getTeacherSchedule,
  createSessions
};