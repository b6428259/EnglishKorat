/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Clear existing entries
  await knex('branches').del();
  
  // Insert seed entries
  await knex('branches').insert([
    {
      id: 1,
      name: 'The Mall Branch',
      code: 'MALL',
      address: 'The Mall Korat, Nakhon Ratchasima',
      phone: '044-123456',
      type: 'offline',
      active: true
    },
    {
      id: 2,
      name: 'Technology Branch', 
      code: 'TECH',
      address: 'Technology Area, Nakhon Ratchasima',
      phone: '044-123457',
      type: 'offline',
      active: true
    },
    {
      id: 3,
      name: 'Online Branch',
      code: 'ONLINE',
      address: 'Virtual Campus',
      phone: '044-123458',
      type: 'online',
      active: true
    }
  ]);
};