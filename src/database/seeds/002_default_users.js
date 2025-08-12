const bcrypt = require('bcryptjs');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Clear existing entries
  await knex('users').del();
  
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  // Insert seed entries
  await knex('users').insert([
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
    }
  ]);
};