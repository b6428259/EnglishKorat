/**
 * Seed data for user permissions system
 * Creates comprehensive permission structure for all user roles
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Clear existing entries
  await knex('user_permissions').del();
  await knex('permissions').del();
  
  // Insert permissions for different modules
  await knex('permissions').insert([
    // User Management
    { id: 1, name: 'users.view', description: 'View user profiles', module: 'users' },
    { id: 2, name: 'users.create', description: 'Create new users', module: 'users' },
    { id: 3, name: 'users.edit', description: 'Edit user profiles', module: 'users' },
    { id: 4, name: 'users.delete', description: 'Delete users', module: 'users' },
    { id: 5, name: 'users.manage_roles', description: 'Assign user roles', module: 'users' },
    
    // Course Management
    { id: 6, name: 'courses.view', description: 'View courses', module: 'courses' },
    { id: 7, name: 'courses.create', description: 'Create new courses', module: 'courses' },
    { id: 8, name: 'courses.edit', description: 'Edit courses', module: 'courses' },
    { id: 9, name: 'courses.delete', description: 'Delete courses', module: 'courses' },
    { id: 10, name: 'courses.manage_groups', description: 'Manage course groups', module: 'courses' },
    
    // Class & Schedule Management
    { id: 11, name: 'classes.view', description: 'View class schedules', module: 'classes' },
    { id: 12, name: 'classes.create', description: 'Create class schedules', module: 'classes' },
    { id: 13, name: 'classes.edit', description: 'Edit class schedules', module: 'classes' },
    { id: 14, name: 'classes.delete', description: 'Delete class schedules', module: 'classes' },
    { id: 15, name: 'classes.mark_attendance', description: 'Mark student attendance', module: 'classes' },
    { id: 16, name: 'classes.generate_qr', description: 'Generate QR codes for classes', module: 'classes' },
    
    // Student Management
    { id: 17, name: 'students.view', description: 'View student profiles', module: 'students' },
    { id: 18, name: 'students.register', description: 'Register new students', module: 'students' },
    { id: 19, name: 'students.edit', description: 'Edit student profiles', module: 'students' },
    { id: 20, name: 'students.view_progress', description: 'View student progress', module: 'students' },
    { id: 21, name: 'students.manage_documents', description: 'Manage student documents', module: 'students' },
    
    // Leave Management
    { id: 22, name: 'leaves.view', description: 'View leave requests', module: 'leaves' },
    { id: 23, name: 'leaves.approve', description: 'Approve leave requests', module: 'leaves' },
    { id: 24, name: 'leaves.manage_policies', description: 'Manage leave policies', module: 'leaves' },
    { id: 25, name: 'leaves.schedule_makeup', description: 'Schedule makeup classes', module: 'leaves' },
    
    // Financial Management
    { id: 26, name: 'billing.view', description: 'View bills and payments', module: 'billing' },
    { id: 27, name: 'billing.create', description: 'Create bills', module: 'billing' },
    { id: 28, name: 'billing.edit', description: 'Edit bills', module: 'billing' },
    { id: 29, name: 'billing.verify_payments', description: 'Verify payment slips', module: 'billing' },
    { id: 30, name: 'billing.manage_salaries', description: 'Manage teacher salaries', module: 'billing' },
    
    // Reports Management
    { id: 31, name: 'reports.view', description: 'View teaching reports', module: 'reports' },
    { id: 32, name: 'reports.create', description: 'Create teaching reports', module: 'reports' },
    { id: 33, name: 'reports.edit', description: 'Edit teaching reports', module: 'reports' },
    { id: 34, name: 'reports.analytics', description: 'View analytics and statistics', module: 'reports' },
    
    // Room Management
    { id: 35, name: 'rooms.view', description: 'View room availability', module: 'rooms' },
    { id: 36, name: 'rooms.manage', description: 'Manage room bookings', module: 'rooms' },
    { id: 37, name: 'rooms.conflicts', description: 'Resolve room conflicts', module: 'rooms' },
    
    // Notification Management
    { id: 38, name: 'notifications.view', description: 'View notifications', module: 'notifications' },
    { id: 39, name: 'notifications.send', description: 'Send notifications', module: 'notifications' },
    { id: 40, name: 'notifications.manage_templates', description: 'Manage notification templates', module: 'notifications' },
    
    // E-book Management
    { id: 41, name: 'ebooks.view', description: 'View e-book catalog', module: 'ebooks' },
    { id: 42, name: 'ebooks.manage', description: 'Manage e-book inventory', module: 'ebooks' },
    { id: 43, name: 'ebooks.lending', description: 'Manage book lending', module: 'ebooks' },
    
    // System Administration
    { id: 44, name: 'system.backup', description: 'Perform system backups', module: 'system' },
    { id: 45, name: 'system.maintenance', description: 'System maintenance tasks', module: 'system' },
    { id: 46, name: 'system.audit_logs', description: 'View audit logs', module: 'system' },
    { id: 47, name: 'system.manage_branches', description: 'Manage branch settings', module: 'system' },
    
    // Owner-only permissions
    { id: 48, name: 'owner.full_access', description: 'Full system access', module: 'owner' },
    { id: 49, name: 'owner.policy_changes', description: 'Approve policy changes', module: 'owner' },
    { id: 50, name: 'owner.financial_reports', description: 'View comprehensive financial reports', module: 'owner' }
  ]);

  // Get users for permission assignment
  const users = await knex('users').select('*');
  if (users.length === 0) {
    console.log('No users found - skipping permission assignment');
    return;
  }

  const ownerUser = users.find(u => u.role === 'owner');
  const adminUsers = users.filter(u => u.role === 'admin');
  const teacherUsers = users.filter(u => u.role === 'teacher');
  const studentUsers = users.filter(u => u.role === 'student');

  const permissionAssignments = [];

  // Owner gets all permissions
  if (ownerUser) {
    for (let i = 1; i <= 50; i++) {
      permissionAssignments.push({
        user_id: ownerUser.id,
        permission_id: i,
        granted_by: ownerUser.id
      });
    }
  }

  // Admin permissions (comprehensive but not owner-specific)
  const adminPermissions = [
    1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    22, 23, 24, 25, 26, 27, 28, 29, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
    41, 42, 43, 45, 46, 47
  ];
  
  adminUsers.forEach(admin => {
    adminPermissions.forEach(permId => {
      permissionAssignments.push({
        user_id: admin.id,
        permission_id: permId,
        granted_by: ownerUser ? ownerUser.id : admin.id
      });
    });
  });

  // Teacher permissions (teaching and reporting focused)
  const teacherPermissions = [
    1, 6, 11, 15, 16, 17, 20, 22, 25, 31, 32, 33, 35, 38, 41, 43
  ];
  
  teacherUsers.forEach(teacher => {
    teacherPermissions.forEach(permId => {
      permissionAssignments.push({
        user_id: teacher.id,
        permission_id: permId,
        granted_by: ownerUser ? ownerUser.id : teacher.id
      });
    });
  });

  // Student permissions (view only for their own data)
  const studentPermissions = [1, 6, 11, 17, 38, 41];
  
  studentUsers.forEach(student => {
    studentPermissions.forEach(permId => {
      permissionAssignments.push({
        user_id: student.id,
        permission_id: permId,
        granted_by: ownerUser ? ownerUser.id : student.id
      });
    });
  });

  // Insert permission assignments
  if (permissionAssignments.length > 0) {
    await knex('user_permissions').insert(permissionAssignments);
  }

  console.log(`✅ Inserted ${permissionAssignments.length} permission assignments`);
};