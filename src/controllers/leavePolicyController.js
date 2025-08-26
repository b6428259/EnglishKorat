const { db } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Create a new leave policy rule
// @route   POST /api/v1/leave-policies
// @access  Private (Admin, Owner)
const createLeavePolicyRule = asyncHandler(async (req, res) => {
  const {
    rule_name,
    course_type,
    course_hours,
    max_students,
    leave_credits,
    price_per_hour,
    conditions,
    effective_date,
    expiry_date
  } = req.body;

  // Only admin and owner can create leave policy rules
  if (!['admin', 'owner'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or Owner role required.'
    });
  }

  // Validate required fields
  if (!rule_name || !course_type || !course_hours || !leave_credits || !effective_date) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: rule_name, course_type, course_hours, leave_credits, effective_date'
    });
  }

  // Validate no negative values
  if (leave_credits < 0 || (price_per_hour && price_per_hour < 0)) {
    return res.status(400).json({
      success: false,
      message: 'Negative values are not allowed for leave_credits or price_per_hour'
    });
  }

  const branch_id = req.user.role === 'owner' ? req.body.branch_id || req.user.branch_id : req.user.branch_id;

  // Check for overlapping rules
  const existingRule = await db('leave_policy_rules')
    .where('branch_id', branch_id)
    .where('course_type', course_type)
    .where('course_hours', course_hours)
    .where('status', 'active')
    .where(function() {
      this.where('expiry_date', '>=', effective_date)
        .orWhere('expiry_date', null);
    })
    .where('effective_date', '<=', expiry_date || '9999-12-31')
    .first();

  if (existingRule) {
    return res.status(400).json({
      success: false,
      message: 'Overlapping leave policy rule already exists for this course type and hours'
    });
  }

  const trx = await db.transaction();

  try {
    // Create the leave policy rule
    const [ruleId] = await trx('leave_policy_rules').insert({
      branch_id,
      rule_name,
      course_type,
      course_hours,
      max_students: max_students || 1,
      leave_credits,
      price_per_hour,
      conditions: conditions ? JSON.stringify(conditions) : null,
      effective_date,
      expiry_date,
      status: 'active',
      created_by: req.user.id
    });

    // Grant default permissions to creator and owner
    const permissions = [
      { policy_rule_id: ruleId, user_id: req.user.id, permission_type: 'edit' }
    ];

    // If creator is not owner, also grant owner permissions
    if (req.user.role !== 'owner') {
      const owners = await trx('users')
        .where('role', 'owner')
        .where('branch_id', branch_id)
        .select('id');
      
      owners.forEach(owner => {
        permissions.push({
          policy_rule_id: ruleId,
          user_id: owner.id,
          permission_type: 'edit'
        });
      });
    }

    for (const permission of permissions) {
      await trx('leave_policy_permissions').insert({
        ...permission,
        granted_by: req.user.id
      });
    }

    // Log the creation in change history
    await trx('leave_policy_changes').insert({
      policy_rule_id: ruleId,
      change_type: 'create',
      changed_by: req.user.id,
      change_reason: 'Initial creation of leave policy rule',
      old_values: null,
      new_values: JSON.stringify({
        rule_name,
        course_type,
        course_hours,
        max_students: max_students || 1,
        leave_credits,
        price_per_hour,
        conditions,
        effective_date,
        expiry_date
      }),
      field_changes: `Created new leave policy rule: ${rule_name}`,
      status: 'applied',
      applied_at: new Date()
    });

    // Send notifications to owners (if creator is not owner)
    if (req.user.role !== 'owner') {
      const owners = await trx('users')
        .where('role', 'owner')
        .where('branch_id', branch_id)
        .select('id', 'username');

      for (const owner of owners) {
        await trx('leave_policy_notifications').insert({
          change_id: await trx('leave_policy_changes').max('id').first().then(result => result['max(`id`)']),
          recipient_id: owner.id,
          notification_type: 'policy_created',
          title: 'New Leave Policy Rule Created',
          message: `A new leave policy rule "${rule_name}" has been created by ${req.user.username}`,
          metadata: JSON.stringify({
            rule_id: ruleId,
            course_type,
            course_hours,
            leave_credits,
            created_by: req.user.username
          })
        });
      }
    }

    await trx.commit();

    // Get the created rule with full details
    const createdRule = await db('leave_policy_rules')
      .join('branches', 'leave_policy_rules.branch_id', 'branches.id')
      .join('users', 'leave_policy_rules.created_by', 'users.id')
      .select(
        'leave_policy_rules.*',
        'branches.name_en as branch_name_en',
        'branches.name_th as branch_name_th',
        'users.username as created_by_username'
      )
      .where('leave_policy_rules.id', ruleId)
      .first();

    if (createdRule.conditions) {
      createdRule.conditions = JSON.parse(createdRule.conditions);
    }

    res.status(201).json({
      success: true,
      message: 'Leave policy rule created successfully',
      data: createdRule
    });

  } catch (error) {
    await trx.rollback();
    throw error;
  }
});

// @desc    Update a leave policy rule
// @route   PUT /api/v1/leave-policies/:id
// @access  Private (Admin, Owner with permissions)
const updateLeavePolicyRule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { change_reason, ...updateData } = req.body;

  // Require change reason for all updates
  if (!change_reason || change_reason.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Change reason is required for all policy modifications'
    });
  }

  // Get current rule and check permissions
  const currentRule = await db('leave_policy_rules')
    .leftJoin('leave_policy_permissions', function() {
      this.on('leave_policy_rules.id', '=', 'leave_policy_permissions.policy_rule_id')
        .andOn('leave_policy_permissions.user_id', '=', req.user.id)
        .andOn('leave_policy_permissions.permission_type', '=', db.raw('?', ['edit']));
    })
    .select(
      'leave_policy_rules.*',
      'leave_policy_permissions.user_id as has_edit_permission'
    )
    .where('leave_policy_rules.id', id)
    .first();

  if (!currentRule) {
    return res.status(404).json({
      success: false,
      message: 'Leave policy rule not found'
    });
  }

  // Check permissions
  const hasPermission = req.user.role === 'owner' || 
                       currentRule.has_edit_permission === req.user.id ||
                       (req.user.role === 'admin' && currentRule.branch_id === req.user.branch_id);

  if (!hasPermission) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not have permission to edit this leave policy rule.'
    });
  }

  // Validate no negative values in updates
  if ((updateData.leave_credits !== undefined && updateData.leave_credits < 0) ||
      (updateData.price_per_hour !== undefined && updateData.price_per_hour < 0)) {
    return res.status(400).json({
      success: false,
      message: 'Negative values are not allowed for leave_credits or price_per_hour'
    });
  }

  const trx = await db.transaction();

  try {
    // Store old values for change tracking
    const oldValues = {
      rule_name: currentRule.rule_name,
      course_type: currentRule.course_type,
      course_hours: currentRule.course_hours,
      max_students: currentRule.max_students,
      leave_credits: currentRule.leave_credits,
      price_per_hour: currentRule.price_per_hour,
      conditions: currentRule.conditions,
      effective_date: currentRule.effective_date,
      expiry_date: currentRule.expiry_date,
      status: currentRule.status
    };

    // Prepare update data
    const updateFields = {};
    const changedFields = [];

    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined && Object.prototype.hasOwnProperty.call(oldValues, key) && oldValues[key] !== value) {
        updateFields[key] = value;
        changedFields.push(`${key}: ${oldValues[key]} → ${value}`);
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No changes detected'
      });
    }

    // Handle conditions JSON conversion
    if (updateFields.conditions) {
      updateFields.conditions = JSON.stringify(updateFields.conditions);
    }

    // Update the rule
    await trx('leave_policy_rules')
      .where('id', id)
      .update(updateFields);

    // Log the change
    const [changeId] = await trx('leave_policy_changes').insert({
      policy_rule_id: id,
      change_type: 'update',
      changed_by: req.user.id,
      change_reason: change_reason.trim(),
      old_values: JSON.stringify(oldValues),
      new_values: JSON.stringify({ ...oldValues, ...updateFields }),
      field_changes: changedFields.join(', '),
      status: 'applied',
      applied_at: new Date()
    });

    // Send notifications to owners
    const owners = await trx('users')
      .where('role', 'owner')
      .where('branch_id', currentRule.branch_id)
      .select('id', 'username');

    for (const owner of owners) {
      await trx('leave_policy_notifications').insert({
        change_id: changeId,
        recipient_id: owner.id,
        notification_type: 'policy_updated',
        title: 'Leave Policy Rule Updated',
        message: `Leave policy rule "${currentRule.rule_name}" has been updated by ${req.user.username}. Changes: ${changedFields.join(', ')}`,
        metadata: JSON.stringify({
          rule_id: id,
          changed_fields: changedFields,
          change_reason: change_reason.trim(),
          changed_by: req.user.username,
          old_values: oldValues,
          new_values: { ...oldValues, ...updateFields }
        })
      });
    }

    await trx.commit();

    // Get updated rule
    const updatedRule = await db('leave_policy_rules')
      .join('branches', 'leave_policy_rules.branch_id', 'branches.id')
      .join('users', 'leave_policy_rules.created_by', 'users.id')
      .select(
        'leave_policy_rules.*',
        'branches.name_en as branch_name_en',
        'branches.name_th as branch_name_th',
        'users.username as created_by_username'
      )
      .where('leave_policy_rules.id', id)
      .first();

    if (updatedRule.conditions) {
      updatedRule.conditions = JSON.parse(updatedRule.conditions);
    }

    res.json({
      success: true,
      message: 'Leave policy rule updated successfully',
      data: updatedRule
    });

  } catch (error) {
    await trx.rollback();
    throw error;
  }
});

// @desc    Get all leave policy rules
// @route   GET /api/v1/leave-policies
// @access  Private
const getLeavePolicyRules = asyncHandler(async (req, res) => {
  const { branch_id, course_type, status = 'active', page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let query = db('leave_policy_rules')
    .join('branches', 'leave_policy_rules.branch_id', 'branches.id')
    .join('users', 'leave_policy_rules.created_by', 'users.id')
    .select(
      'leave_policy_rules.*',
        'branches.name_en as branch_name_en',
        'branches.name_th as branch_name_th',
      'users.username as created_by_username'
    );

  // Apply branch filter based on user role
  if (req.user.role === 'owner') {
    if (branch_id) {
      query = query.where('leave_policy_rules.branch_id', branch_id);
    }
  } else {
    query = query.where('leave_policy_rules.branch_id', req.user.branch_id);
  }

  // Apply other filters
  if (course_type) {
    query = query.where('leave_policy_rules.course_type', course_type);
  }
  if (status) {
    query = query.where('leave_policy_rules.status', status);
  }

  // Get total count
  const countQuery = query.clone().clearSelect().count('* as total');
  const [{ total }] = await countQuery;

  // Apply pagination and get results
  const rules = await query
    .limit(limit)
    .offset(offset)
    .orderBy('leave_policy_rules.effective_date', 'desc');

  // Parse conditions JSON for each rule
  rules.forEach(rule => {
    if (rule.conditions) {
      rule.conditions = JSON.parse(rule.conditions);
    }
  });

  res.json({
    success: true,
    data: rules,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      pages: Math.ceil(total / limit)
    }
  });
});

// @desc    Get leave policy rule by ID
// @route   GET /api/v1/leave-policies/:id
// @access  Private
const getLeavePolicyRuleById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const rule = await db('leave_policy_rules')
    .join('branches', 'leave_policy_rules.branch_id', 'branches.id')
    .join('users', 'leave_policy_rules.created_by', 'users.id')
    .select(
      'leave_policy_rules.*',
        'branches.name_en as branch_name_en',
        'branches.name_th as branch_name_th',
      'users.username as created_by_username'
    )
    .where('leave_policy_rules.id', id)
    .first();

  if (!rule) {
    return res.status(404).json({
      success: false,
      message: 'Leave policy rule not found'
    });
  }

  // Check branch permissions
  if (req.user.role !== 'owner' && rule.branch_id !== req.user.branch_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  if (rule.conditions) {
    rule.conditions = JSON.parse(rule.conditions);
  }

  // Get permissions for this rule
  const permissions = await db('leave_policy_permissions')
    .join('users', 'leave_policy_permissions.user_id', 'users.id')
    .select(
      'leave_policy_permissions.*',
      'users.username',
      'users.role'
    )
    .where('leave_policy_permissions.policy_rule_id', id);

  rule.permissions = permissions;

  res.json({
    success: true,
    data: rule
  });
});

module.exports = {
  createLeavePolicyRule,
  updateLeavePolicyRule,
  getLeavePolicyRules,
  getLeavePolicyRuleById
};