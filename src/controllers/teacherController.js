
const { db } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { safeJsonParse } = require('../utils/safeJson');

// @desc    Register a new teacher
// @route   POST /api/v1/teachers/register
// @access  Public
const registerTeacher = asyncHandler(async (req, res) => {
	const {
		username,
		password,
		email,
		phone,
		line_id,
		first_name,
		last_name,
		nickname,
		nationality,
		teacher_type,
		hourly_rate,
		specializations,
		certifications,
		active = true,
		branch_id
	} = req.body;

	// Use database transaction
	const result = await db.transaction(async (trx) => {
		// Create user account
		const [userId] = await trx('users').insert({
			username,
			password: require('bcryptjs').hashSync(password, 10),
			email,
			phone,
			line_id,
			role: 'teacher',
			branch_id,
			status: active ? 'active' : 'inactive'
		});

		// Create teacher profile
		const [teacherId] = await trx('teachers').insert({
			user_id: userId,
			first_name,
			last_name,
			nickname,
			nationality,
			teacher_type,
			hourly_rate,
			specializations: JSON.stringify(specializations || []),
			certifications: JSON.stringify(certifications || []),
			active
		});

		return { userId, teacherId };
	});

	// Get complete teacher data
	const teacher = await db('teachers')
		.join('users', 'teachers.user_id', 'users.id')
		.select(
			'teachers.*',
			'users.username',
			'users.email',
			'users.phone',
			'users.line_id',
			'users.status',
			'users.branch_id'
		)
		.where('teachers.id', result.teacherId)
		.first();

	res.status(201).json({
		success: true,
		message: 'Teacher registered successfully',
		data: { teacher }
	});
});

// @desc    Get all teachers
// @route   GET /api/v1/teachers
// @access  Private (Admin, Owner)
const getTeachers = asyncHandler(async (req, res) => {
	const { page = 1, limit = 20, search, branch_id, status, teacher_type } = req.query;
	const offset = (page - 1) * limit;

	let query = db('teachers')
		.join('users', 'teachers.user_id', 'users.id')
		.select(
			'teachers.id',
			'teachers.first_name',
			'teachers.last_name',
			'teachers.nickname',
			'teachers.nationality',
			'teachers.teacher_type',
			'teachers.hourly_rate',
			'teachers.specializations',
			'teachers.certifications',
			'teachers.active',
			'users.username',
			'users.email',
			'users.phone',
			'users.line_id',
			'users.status',
			'users.branch_id',
            'users.avatar',
			'teachers.created_at'
		);

	// Apply filters
	if (search) {
		query = query.where(function() {
			this.where('teachers.first_name', 'like', `%${search}%`)
				.orWhere('teachers.last_name', 'like', `%${search}%`)
				.orWhere('teachers.nickname', 'like', `%${search}%`)
				.orWhere('users.username', 'like', `%${search}%`);
		});
	}
	if (branch_id) {
		query = query.where('users.branch_id', branch_id);
	}
	if (status) {
		query = query.where('users.status', status);
	}
	if (teacher_type) {
		query = query.where('teachers.teacher_type', teacher_type);
	}

	const teachers = await query
		.orderBy('teachers.created_at', 'desc')
		.limit(limit)
		.offset(offset);

	// Get total count for pagination
	const totalQuery = db('teachers')
		.join('users', 'teachers.user_id', 'users.id')
		.count('* as total');
	if (search) {
		totalQuery.where(function() {
			this.where('teachers.first_name', 'like', `%${search}%`)
				.orWhere('teachers.last_name', 'like', `%${search}%`)
				.orWhere('teachers.nickname', 'like', `%${search}%`)
				.orWhere('users.username', 'like', `%${search}%`);
		});
	}
	if (branch_id) {
		totalQuery.where('users.branch_id', branch_id);
	}
	if (status) {
		totalQuery.where('users.status', status);
	}
	if (teacher_type) {
		totalQuery.where('teachers.teacher_type', teacher_type);
	}

	const [{ total }] = await totalQuery;

	res.json({
		success: true,
		data: {
			teachers,
			pagination: {
				current_page: parseInt(page),
				per_page: parseInt(limit),
				total: parseInt(total),
				total_pages: Math.ceil(total / limit)
			}
		}
	});
});

// @desc    Get teacher by ID
// @route   GET /api/v1/teachers/:id
// @access  Private
const getTeacher = asyncHandler(async (req, res) => {
	const { id } = req.params;

	let query = db('teachers')
		.join('users', 'teachers.user_id', 'users.id')
		.select(
			'teachers.*',
			'users.username',
			'users.email',
			'users.phone',
			'users.line_id',
			'users.status',
			'users.branch_id',
			'users.avatar',
		)
		.where('teachers.id', id);

	if (req.user.role !== 'owner') {
		query = query.where('users.branch_id', req.user.branch_id);
	}

	const teacher = await query.first();

	if (!teacher) {
		return res.status(404).json({ success: false, message: 'Teacher not found' });
	}

	teacher.specializations = safeJsonParse(teacher.specializations);
	teacher.certifications = safeJsonParse(teacher.certifications);

	return res.json({ success: true, data: { teacher } });
});

// @desc    Update teacher information
// @route   PUT /api/v1/teachers/:id
// @access  Private (Admin, Owner, Teacher themselves)
const updateTeacher = asyncHandler(async (req, res) => {
	const { id } = req.params;
	const updateData = req.body;

	// Get current teacher to check permissions
	const teacher = await db('teachers')
		.join('users', 'teachers.user_id', 'users.id')
		.select('teachers.*', 'users.branch_id')
		.where('teachers.id', id)
		.first();

	if (!teacher) {
		return res.status(404).json({
			success: false,
			message: 'Teacher not found'
		});
	}

	// Check permissions
	if (req.user.role === 'teacher' && teacher.user_id !== req.user.id) {
		return res.status(403).json({
			success: false,
			message: 'Access denied'
		});
	}
	if (req.user.role !== 'owner' && teacher.branch_id !== req.user.branch_id) {
		return res.status(403).json({
			success: false,
			message: 'Access denied. Cannot access other branch data.'
		});
	}

	// Prepare update data
	const allowedFields = [
		'first_name', 'last_name', 'nickname', 'nationality', 'teacher_type',
		'hourly_rate', 'specializations', 'certifications', 'active'
	];
	const teacherUpdateData = {};
	for (const field of allowedFields) {
		if (updateData[field] !== undefined) {
			if ((field === 'specializations' || field === 'certifications') && typeof updateData[field] === 'object') {
				teacherUpdateData[field] = JSON.stringify(updateData[field]);
			} else {
				teacherUpdateData[field] = updateData[field];
			}
		}
	}

	if (Object.keys(teacherUpdateData).length > 0) {
		await db('teachers')
			.where('id', id)
			.update(teacherUpdateData);
	}

	// Get updated teacher data
	const updatedTeacher = await db('teachers')
		.join('users', 'teachers.user_id', 'users.id')
		.select(
			'teachers.*',
			'users.username',
			'users.email',
			'users.phone',
			'users.line_id',
			'users.status',
			'users.branch_id'
		)
		.where('teachers.id', id)
		.first();

	updatedTeacher.specializations = safeJsonParse(updatedTeacher.specializations);
	updatedTeacher.certifications = safeJsonParse(updatedTeacher.certifications);

	res.json({
		success: true,
		message: 'Teacher updated successfully',
		data: { teacher: updatedTeacher }
	});
});

module.exports = {
	registerTeacher,
	getTeachers,
	getTeacher,
	updateTeacher
};
