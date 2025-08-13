/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Delete existing entries
  await knex('students').del();
  
  // Insert sample students with diverse profiles
  await knex('students').insert([
    {
      id: 1,
      user_id: 3,
      first_name: 'อลิซ',
      last_name: 'วิลสัน',
      nickname: 'Alice',
      age: 25,
      cefr_level: 'B1',
      grammar_score: 75,
      speaking_score: 70,
      listening_score: 80,
      learning_preferences: 'Works in hospitality industry, wants to improve English for career advancement',
      preferred_teacher_type: 'native'
    },
    {
      id: 2,
      user_id: 4,
      first_name: 'ณัฐพล',
      last_name: 'สมประสงค์',
      nickname: 'Nut',
      age: 22,
      cefr_level: 'A2',
      grammar_score: 60,
      speaking_score: 55,
      listening_score: 65,
      learning_preferences: 'University student preparing for study abroad program',
      preferred_teacher_type: 'native'
    },
    {
      id: 3,
      user_id: 5,
      first_name: 'ศิรประภา',
      last_name: 'จันทร์แสง',
      nickname: 'Fai',
      age: 28,
      cefr_level: 'C1',
      grammar_score: 90,
      speaking_score: 85,
      listening_score: 88,
      learning_preferences: 'Teacher looking to improve English for international school position',
      preferred_teacher_type: 'native'
    },
    {
      id: 4,
      user_id: 6,
      first_name: 'กิตติพงษ์',
      last_name: 'รุ่งเรือง',
      nickname: 'Kit',
      age: 30,
      cefr_level: 'B2',
      grammar_score: 82,
      speaking_score: 78,
      listening_score: 80,
      learning_preferences: 'Business professional preparing for IELTS exam',
      preferred_teacher_type: 'native'
    },
    {
      id: 5,
      user_id: 7,
      first_name: 'มนัสวี',
      last_name: 'ทองใส',
      nickname: 'Mint',
      age: 19,
      cefr_level: 'A1',
      grammar_score: 45,
      speaking_score: 40,
      listening_score: 50,
      learning_preferences: 'High school graduate starting English foundation course',
      preferred_teacher_type: 'thai'
    }
  ]);

  console.log('✅ Sample students created successfully!');
  console.log('👥 Created 5 student profiles');
  console.log('🎯 CEFR levels from A1 to C1');
  console.log('📊 Diverse skill levels and backgrounds');
};