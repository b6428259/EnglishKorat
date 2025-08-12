const { db } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all rooms
// @route   GET /api/v1/rooms
// @access  Private
const getRooms = asyncHandler(async (req, res) => {
  const { branch_id, status = 'available' } = req.query;

  let query = db('rooms')
    .join('branches', 'rooms.branch_id', 'branches.id')
    .select(
      'rooms.*',
      'branches.name as branch_name',
      'branches.code as branch_code'
    );

  // Apply filters
  if (branch_id) {
    query = query.where('rooms.branch_id', branch_id);
  } else if (req.user.role !== 'owner') {
    // Non-owners can only see their branch rooms
    query = query.where('rooms.branch_id', req.user.branch_id);
  }

  if (status) {
    query = query.where('rooms.status', status);
  }

  const rooms = await query.orderBy('branches.name', 'asc').orderBy('rooms.room_name', 'asc');

  // Parse JSON fields
  rooms.forEach(room => {
    if (room.equipment) {
      room.equipment = JSON.parse(room.equipment);
    }
  });

  res.json({
    success: true,
    data: { rooms }
  });
});

// @desc    Get room availability
// @route   GET /api/v1/rooms/availability
// @access  Private
const getRoomAvailability = asyncHandler(async (req, res) => {
  const { date, start_time, end_time, branch_id } = req.query;

  if (!date || !start_time || !end_time) {
    return res.status(400).json({
      success: false,
      message: 'Date, start_time, and end_time are required'
    });
  }

  let roomsQuery = db('rooms')
    .join('branches', 'rooms.branch_id', 'branches.id')
    .select(
      'rooms.*',
      'branches.name as branch_name',
      'branches.code as branch_code'
    )
    .where('rooms.status', 'available');

  if (branch_id) {
    roomsQuery = roomsQuery.where('rooms.branch_id', branch_id);
  } else if (req.user.role !== 'owner') {
    roomsQuery = roomsQuery.where('rooms.branch_id', req.user.branch_id);
  }

  const allRooms = await roomsQuery;

  // Get conflicting classes for the given time slot
  const conflictingClasses = await db('classes')
    .select('room_id')
    .where('class_date', date)
    .where('status', '!=', 'cancelled')
    .where(function() {
      this.where(function() {
        // Class starts during the requested time
        this.where('start_time', '>=', start_time)
          .where('start_time', '<', end_time);
      })
        .orWhere(function() {
          // Class ends during the requested time
          this.where('end_time', '>', start_time)
            .where('end_time', '<=', end_time);
        })
        .orWhere(function() {
          // Class spans the entire requested time
          this.where('start_time', '<=', start_time)
            .where('end_time', '>=', end_time);
        });
    });

  const occupiedRoomIds = conflictingClasses.map(c => c.room_id);

  const availableRooms = allRooms.filter(room => !occupiedRoomIds.includes(room.id));

  // Parse JSON fields
  availableRooms.forEach(room => {
    if (room.equipment) {
      room.equipment = JSON.parse(room.equipment);
    }
  });

  res.json({
    success: true,
    data: {
      date,
      time_slot: `${start_time} - ${end_time}`,
      available_rooms: availableRooms,
      total_available: availableRooms.length
    }
  });
});

// @desc    Get room suggestions based on group size
// @route   GET /api/v1/rooms/suggestions
// @access  Private
const getRoomSuggestions = asyncHandler(async (req, res) => {
  const { date, start_time, end_time, student_count = 1, branch_id } = req.query;

  if (!date || !start_time || !end_time) {
    return res.status(400).json({
      success: false,
      message: 'Date, start_time, and end_time are required'
    });
  }

  const studentCount = parseInt(student_count);

  // Get available rooms for the time slot
  let roomsQuery = db('rooms')
    .join('branches', 'rooms.branch_id', 'branches.id')
    .select(
      'rooms.*',
      'branches.name as branch_name',
      'branches.code as branch_code'
    )
    .where('rooms.status', 'available')
    .where('rooms.capacity', '>=', studentCount);

  if (branch_id) {
    roomsQuery = roomsQuery.where('rooms.branch_id', branch_id);
  } else if (req.user.role !== 'owner') {
    roomsQuery = roomsQuery.where('rooms.branch_id', req.user.branch_id);
  }

  const allSuitableRooms = await roomsQuery;

  // Check availability for the time slot
  const conflictingClasses = await db('classes')
    .select('room_id')
    .where('class_date', date)
    .where('status', '!=', 'cancelled')
    .where(function() {
      this.where(function() {
        this.where('start_time', '>=', start_time)
          .where('start_time', '<', end_time);
      })
        .orWhere(function() {
          this.where('end_time', '>', start_time)
            .where('end_time', '<=', end_time);
        })
        .orWhere(function() {
          this.where('start_time', '<=', start_time)
            .where('end_time', '>=', end_time);
        });
    });

  const occupiedRoomIds = conflictingClasses.map(c => c.room_id);
  const availableRooms = allSuitableRooms.filter(room => !occupiedRoomIds.includes(room.id));

  // Sort by efficiency (closest to required capacity)
  const suggestions = availableRooms
    .map(room => ({
      ...room,
      equipment: room.equipment ? JSON.parse(room.equipment) : [],
      efficiency: room.capacity - studentCount, // Lower is better
      utilization: Math.round((studentCount / room.capacity) * 100)
    }))
    .sort((a, b) => a.efficiency - b.efficiency);

  res.json({
    success: true,
    data: {
      search_criteria: {
        date,
        time_slot: `${start_time} - ${end_time}`,
        student_count: studentCount,
        branch_id: branch_id || req.user.branch_id
      },
      suggestions: suggestions.slice(0, 5), // Top 5 suggestions
      total_available: suggestions.length
    }
  });
});

// @desc    Create a new room
// @route   POST /api/v1/rooms
// @access  Private (Admin, Owner)
const createRoom = asyncHandler(async (req, res) => {
  const {
    branch_id,
    room_name,
    capacity,
    equipment = [],
    status = 'available'
  } = req.body;

  // Check if room name already exists in the branch
  const existingRoom = await db('rooms')
    .where('branch_id', branch_id)
    .where('room_name', room_name)
    .first();

  if (existingRoom) {
    return res.status(400).json({
      success: false,
      message: 'Room name already exists in this branch'
    });
  }

  // Verify branch exists
  const branch = await db('branches')
    .where('id', branch_id)
    .first();

  if (!branch) {
    return res.status(400).json({
      success: false,
      message: 'Branch not found'
    });
  }

  // Create room
  const [roomId] = await db('rooms').insert({
    branch_id,
    room_name,
    capacity,
    equipment: JSON.stringify(equipment),
    status
  });

  // Get created room with branch info
  const room = await db('rooms')
    .join('branches', 'rooms.branch_id', 'branches.id')
    .select(
      'rooms.*',
      'branches.name as branch_name',
      'branches.code as branch_code'
    )
    .where('rooms.id', roomId)
    .first();

  if (room.equipment) {
    room.equipment = JSON.parse(room.equipment);
  }

  res.status(201).json({
    success: true,
    message: 'Room created successfully',
    data: { room }
  });
});

// @desc    Update room
// @route   PUT /api/v1/rooms/:id
// @access  Private (Admin, Owner)
const updateRoom = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Get current room to check permissions
  const room = await db('rooms')
    .where('id', id)
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
      message: 'Access denied. Cannot access other branch data.'
    });
  }

  // Prepare update data
  const allowedFields = ['room_name', 'capacity', 'equipment', 'status'];
  const roomUpdateData = {};

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      if (field === 'equipment' && Array.isArray(updateData[field])) {
        roomUpdateData[field] = JSON.stringify(updateData[field]);
      } else {
        roomUpdateData[field] = updateData[field];
      }
    }
  }

  if (Object.keys(roomUpdateData).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No data to update'
    });
  }

  await db('rooms')
    .where('id', id)
    .update(roomUpdateData);

  // Get updated room
  const updatedRoom = await db('rooms')
    .join('branches', 'rooms.branch_id', 'branches.id')
    .select(
      'rooms.*',
      'branches.name as branch_name',
      'branches.code as branch_code'
    )
    .where('rooms.id', id)
    .first();

  if (updatedRoom.equipment) {
    updatedRoom.equipment = JSON.parse(updatedRoom.equipment);
  }

  res.json({
    success: true,
    message: 'Room updated successfully',
    data: { room: updatedRoom }
  });
});

module.exports = {
  getRooms,
  getRoomAvailability,
  getRoomSuggestions,
  createRoom,
  updateRoom
};