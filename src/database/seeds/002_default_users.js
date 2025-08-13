const bcrypt = require('bcryptjs');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Clear existing entries
  await knex('users').del();
  
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  // Insert comprehensive user accounts
  await knex('users').insert([
    // System administrators
    {
      id: 1,
      username: 'admin',
      password: hashedPassword,
      email: 'admin@englishkorat.com',
      phone: '0812345678',
      line_id: 'admin_ekls',
      role: 'admin',
      branch_id: 1,
      status: 'active'
    },
    {
      id: 2,
      username: 'owner',
      password: hashedPassword,
      email: 'owner@englishkorat.com',
      phone: '0812345679',
      line_id: 'owner_ekls',
      role: 'owner',
      branch_id: 1,
      status: 'active'
    },
    
    // Student accounts
    {
      id: 3,
      username: 'alice_w',
      password: hashedPassword,
      email: 'alice.wilson@gmail.com',
      phone: '0891234567',
      line_id: 'alice_ekls',
      role: 'student',
      branch_id: 1,
      status: 'active'
    },
    {
      id: 4,
      username: 'nut_s',
      password: hashedPassword,
      email: 'nuttapol.som@gmail.com',
      phone: '0892345678',
      line_id: 'nut_ekls',
      role: 'student',
      branch_id: 1,
      status: 'active'
    },
    {
      id: 5,
      username: 'fai_c',
      password: hashedPassword,
      email: 'siriprapha.jan@gmail.com',
      phone: '0893456789',
      line_id: 'fai_ekls',
      role: 'student',
      branch_id: 1,
      status: 'active'
    },
    {
      id: 6,
      username: 'kit_r',
      password: hashedPassword,
      email: 'kittipong.rung@gmail.com',
      phone: '0894567890',
      line_id: 'kit_ekls',
      role: 'student',
      branch_id: 1,
      status: 'active'
    },
    {
      id: 7,
      username: 'mint_t',
      password: hashedPassword,
      email: 'manaswee.tong@gmail.com',
      phone: '0895678901',
      line_id: 'mint_ekls',
      role: 'student',
      branch_id: 1,
      status: 'active'
    },
    
    // Teacher accounts
    {
      id: 8,
      username: 'teacher_john',
      password: hashedPassword,
      email: 'john.smith@englishkorat.com',
      phone: '0896789012',
      line_id: 'john_teacher',
      role: 'teacher',
      branch_id: 1,
      status: 'active'
    },
    {
      id: 9,
      username: 'teacher_sarah',
      password: hashedPassword,
      email: 'sarah.johnson@englishkorat.com',
      phone: '0897890123',
      line_id: 'sarah_teacher',
      role: 'teacher',
      branch_id: 1,
      status: 'active'
    }
  ]);

  console.log('✅ Enhanced user accounts created successfully!');
  console.log('👤 2 Admin/Owner accounts');
  console.log('👥 5 Student accounts');
  console.log('👨‍🏫 2 Teacher accounts');
  console.log('🔑 All passwords: admin123');
};