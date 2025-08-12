/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Clear existing entries
  await knex('rooms').del();
  
  // Insert seed entries for each branch
  await knex('rooms').insert([
    // The Mall Branch rooms
    { branch_id: 1, room_name: 'Room A1', capacity: 8, equipment: JSON.stringify(['whiteboard', 'projector', 'air_conditioning']), status: 'available' },
    { branch_id: 1, room_name: 'Room A2', capacity: 6, equipment: JSON.stringify(['whiteboard', 'speakers', 'air_conditioning']), status: 'available' },
    { branch_id: 1, room_name: 'Room A3', capacity: 10, equipment: JSON.stringify(['whiteboard', 'projector', 'speakers', 'air_conditioning']), status: 'available' },
    
    // Technology Branch rooms
    { branch_id: 2, room_name: 'Tech B1', capacity: 12, equipment: JSON.stringify(['smart_board', 'projector', 'computers', 'air_conditioning']), status: 'available' },
    { branch_id: 2, room_name: 'Tech B2', capacity: 8, equipment: JSON.stringify(['whiteboard', 'projector', 'air_conditioning']), status: 'available' },
    
    // Online Branch virtual rooms
    { branch_id: 3, room_name: 'Virtual Room 1', capacity: 20, equipment: JSON.stringify(['zoom_pro', 'breakout_rooms', 'recording']), status: 'available' },
    { branch_id: 3, room_name: 'Virtual Room 2', capacity: 15, equipment: JSON.stringify(['zoom_pro', 'breakout_rooms', 'recording']), status: 'available' },
  ]);
};