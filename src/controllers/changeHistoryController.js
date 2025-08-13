const { db } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get change history for leave policy rules
// @route   GET /api/v1/leave-policies/changes
// @access  Private (Admin, Owner)
const getChangesHistory = asyncHandler(async (req, res) => {
  const { policy_rule_id, page = 1, limit = 20, change_type } = req.query;
  const offset = (page - 1) * limit;

  let query = db('leave_policy_changes')
    .join('leave_policy_rules', 'leave_policy_changes.policy_rule_id', 'leave_policy_rules.id')
    .join('users as changed_by_user', 'leave_policy_changes.changed_by', 'changed_by_user.id')
    .leftJoin('users as approved_by_user', 'leave_policy_changes.approved_by', 'approved_by_user.id')
    .select(
      'leave_policy_changes.*',
      'leave_policy_rules.rule_name',
      'leave_policy_rules.branch_id',
      'changed_by_user.username as changed_by_username',
      'changed_by_user.role as changed_by_role',
      'approved_by_user.username as approved_by_username'
    );

  // Apply branch permissions
  if (req.user.role !== 'owner') {
    query = query.where('leave_policy_rules.branch_id', req.user.branch_id);
  }

  // Apply filters
  if (policy_rule_id) {
    query = query.where('leave_policy_changes.policy_rule_id', policy_rule_id);
  }
  if (change_type) {
    query = query.where('leave_policy_changes.change_type', change_type);
  }

  // Get total count
  const countQuery = query.clone().clearSelect().count('* as total');
  const [{ total }] = await countQuery;

  // Apply pagination and get results
  const changes = await query
    .limit(limit)
    .offset(offset)
    .orderBy('leave_policy_changes.created_at', 'desc');

  // Parse JSON fields
  changes.forEach(change => {
    if (change.old_values) {
      change.old_values = JSON.parse(change.old_values);
    }
    if (change.new_values) {
      change.new_values = JSON.parse(change.new_values);
    }
  });

  res.json({
    success: true,
    data: changes,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      pages: Math.ceil(total / limit)
    }
  });
});

// @desc    Revert a leave policy rule to a previous state
// @route   POST /api/v1/leave-policies/revert/:changeId
// @access  Private (Owner only)
const revertLeavePolicyChange = asyncHandler(async (req, res) => {
  const { changeId } = req.params;
  const { revert_reason } = req.body;

  // Only owners can revert changes
  if (req.user.role !== 'owner') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only owners can revert policy changes.'
    });
  }

  // Require revert reason
  if (!revert_reason || revert_reason.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Revert reason is required'
    });
  }

  // Get the change record to revert
  const changeRecord = await db('leave_policy_changes')
    .join('leave_policy_rules', 'leave_policy_changes.policy_rule_id', 'leave_policy_rules.id')
    .select(
      'leave_policy_changes.*',
      'leave_policy_rules.branch_id'
    )
    .where('leave_policy_changes.id', changeId)
    .first();

  if (!changeRecord) {
    return res.status(404).json({
      success: false,
      message: 'Change record not found'
    });
  }

  // Check if this change has already been reverted
  const existingRevert = await db('leave_policy_changes')
    .where('reverted_from_change_id', changeId)
    .first();

  if (existingRevert) {
    return res.status(400).json({
      success: false,
      message: 'This change has already been reverted'
    });
  }

  // Cannot revert create operations
  if (changeRecord.change_type === 'create') {
    return res.status(400).json({
      success: false,
      message: 'Cannot revert rule creation. Delete the rule instead.'
    });
  }

  const trx = await db.transaction();

  try {
    const oldValues = JSON.parse(changeRecord.old_values);
    const policyRuleId = changeRecord.policy_rule_id;

    // Revert the policy rule to old values
    const revertFields = {};
    for (const [key, value] of Object.entries(oldValues)) {
      if (key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
        revertFields[key] = value;
      }
    }

    // Handle conditions JSON conversion
    if (revertFields.conditions && typeof revertFields.conditions === 'object') {
      revertFields.conditions = JSON.stringify(revertFields.conditions);
    }

    await trx('leave_policy_rules')
      .where('id', policyRuleId)
      .update(revertFields);

    // Log the revert operation
    const [revertChangeId] = await trx('leave_policy_changes').insert({
      policy_rule_id: policyRuleId,
      change_type: 'revert',
      changed_by: req.user.id,
      change_reason: revert_reason.trim(),
      old_values: JSON.stringify(changeRecord.new_values ? JSON.parse(changeRecord.new_values) : {}),
      new_values: JSON.stringify(oldValues),
      field_changes: `Reverted to state before change: ${changeRecord.field_changes}`,
      reverted_from_change_id: changeId,
      status: 'applied',
      applied_at: new Date()
    });

    // Send notifications to all admins and owners
    const recipients = await trx('users')
      .where('branch_id', changeRecord.branch_id)
      .whereIn('role', ['admin', 'owner'])
      .where('id', '!=', req.user.id)
      .select('id', 'username');

    for (const recipient of recipients) {
      await trx('leave_policy_notifications').insert({
        change_id: revertChangeId,
        recipient_id: recipient.id,
        notification_type: 'policy_reverted',
        title: 'Leave Policy Rule Reverted',
        message: `Leave policy rule has been reverted by ${req.user.username}. Reason: ${revert_reason.trim()}`,
        metadata: JSON.stringify({
          rule_id: policyRuleId,
          reverted_change_id: changeId,
          revert_reason: revert_reason.trim(),
          reverted_by: req.user.username,
          original_change: changeRecord.field_changes
        })
      });
    }

    await trx.commit();

    // Get the reverted rule
    const revertedRule = await db('leave_policy_rules')
      .join('branches', 'leave_policy_rules.branch_id', 'branches.id')
      .select(
        'leave_policy_rules.*',
        'branches.name as branch_name'
      )
      .where('leave_policy_rules.id', policyRuleId)
      .first();

    if (revertedRule.conditions) {
      revertedRule.conditions = JSON.parse(revertedRule.conditions);
    }

    res.json({
      success: true,
      message: 'Leave policy rule reverted successfully',
      data: revertedRule
    });

  } catch (error) {
    await trx.rollback();
    throw error;
  }
});

// @desc    Get notifications for current user
// @route   GET /api/v1/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, is_read } = req.query;
  const offset = (page - 1) * limit;

  let query = db('leave_policy_notifications')
    .join('leave_policy_changes', 'leave_policy_notifications.change_id', 'leave_policy_changes.id')
    .join('leave_policy_rules', 'leave_policy_changes.policy_rule_id', 'leave_policy_rules.id')
    .join('users as changed_by_user', 'leave_policy_changes.changed_by', 'changed_by_user.id')
    .select(
      'leave_policy_notifications.*',
      'leave_policy_changes.change_type',
      'leave_policy_changes.field_changes',
      'leave_policy_rules.rule_name',
      'changed_by_user.username as changed_by_username'
    )
    .where('leave_policy_notifications.recipient_id', req.user.id);

  // Apply filters
  if (is_read !== undefined) {
    query = query.where('leave_policy_notifications.is_read', is_read === 'true');
  }

  // Get total count
  const countQuery = query.clone().clearSelect().count('* as total');
  const [{ total }] = await countQuery;

  // Apply pagination and get results
  const notifications = await query
    .limit(limit)
    .offset(offset)
    .orderBy('leave_policy_notifications.created_at', 'desc');

  // Parse metadata JSON
  notifications.forEach(notification => {
    if (notification.metadata) {
      notification.metadata = JSON.parse(notification.metadata);
    }
  });

  res.json({
    success: true,
    data: notifications,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      pages: Math.ceil(total / limit)
    }
  });
});

// @desc    Mark notification as read
// @route   PUT /api/v1/notifications/:id/read
// @access  Private
const markNotificationAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await db('leave_policy_notifications')
    .where('id', id)
    .where('recipient_id', req.user.id)
    .first();

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found'
    });
  }

  await db('leave_policy_notifications')
    .where('id', id)
    .update({
      is_read: true,
      read_at: new Date()
    });

  res.json({
    success: true,
    message: 'Notification marked as read'
  });
});

// @desc    Mark all notifications as read
// @route   PUT /api/v1/notifications/mark-all-read
// @access  Private
const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  await db('leave_policy_notifications')
    .where('recipient_id', req.user.id)
    .where('is_read', false)
    .update({
      is_read: true,
      read_at: new Date()
    });

  res.json({
    success: true,
    message: 'All notifications marked as read'
  });
});

// @desc    Get room notifications
// @route   GET /api/v1/room-notifications
// @access  Private (Teacher, Admin, Owner)
const getRoomNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, is_read } = req.query;
  const offset = (page - 1) * limit;

  let query = db('room_notifications')
    .leftJoin('rooms', 'room_notifications.room_id', 'rooms.id')
    .leftJoin('teachers', 'room_notifications.teacher_id', 'teachers.id')
    .leftJoin('users as teacher_users', 'teachers.user_id', 'teacher_users.id')
    .select(
      'room_notifications.*',
      'rooms.room_name',
      'teacher_users.username as teacher_username'
    );

  // Apply role-based filters
  if (req.user.role === 'teacher') {
    const teacher = await db('teachers').where('user_id', req.user.id).first();
    if (teacher) {
      query = query.where(function() {
        this.where('room_notifications.teacher_id', teacher.id)
          .orWhere('room_notifications.teacher_id', null); // General notifications
      });
    }
  } else if (req.user.role !== 'owner') {
    query = query.where('room_notifications.branch_id', req.user.branch_id);
  }

  // Apply filters
  if (is_read !== undefined) {
    query = query.where('room_notifications.is_read', is_read === 'true');
  }

  // Get total count
  const countQuery = query.clone().clearSelect().count('* as total');
  const [{ total }] = await countQuery;

  // Apply pagination and get results
  const notifications = await query
    .limit(limit)
    .offset(offset)
    .orderBy('room_notifications.created_at', 'desc');

  // Parse metadata JSON
  notifications.forEach(notification => {
    if (notification.metadata) {
      notification.metadata = JSON.parse(notification.metadata);
    }
  });

  res.json({
    success: true,
    data: notifications,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      pages: Math.ceil(total / limit)
    }
  });
});

// @desc    Create room notification
// @route   POST /api/v1/room-notifications
// @access  Private (Admin, Owner)
const createRoomNotification = asyncHandler(async (req, res) => {
  const {
    room_id,
    teacher_id,
    notification_type,
    title,
    message,
    schedule_time,
    metadata
  } = req.body;

  // Only admin and owner can create room notifications
  if (!['admin', 'owner'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or Owner role required.'
    });
  }

  const branch_id = req.user.role === 'owner' ? req.body.branch_id || req.user.branch_id : req.user.branch_id;

  const [notificationId] = await db('room_notifications').insert({
    branch_id,
    room_id,
    teacher_id,
    notification_type,
    title,
    message,
    schedule_time,
    metadata: metadata ? JSON.stringify(metadata) : null
  });

  const createdNotification = await db('room_notifications')
    .leftJoin('rooms', 'room_notifications.room_id', 'rooms.id')
    .leftJoin('teachers', 'room_notifications.teacher_id', 'teachers.id')
    .leftJoin('users as teacher_users', 'teachers.user_id', 'teacher_users.id')
    .select(
      'room_notifications.*',
      'rooms.room_name',
      'teacher_users.username as teacher_username'
    )
    .where('room_notifications.id', notificationId)
    .first();

  if (createdNotification.metadata) {
    createdNotification.metadata = JSON.parse(createdNotification.metadata);
  }

  res.status(201).json({
    success: true,
    message: 'Room notification created successfully',
    data: createdNotification
  });
});

module.exports = {
  getChangesHistory,
  revertLeavePolicyChange,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getRoomNotifications,
  createRoomNotification
};