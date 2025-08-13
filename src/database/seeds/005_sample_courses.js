/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Delete existing entries
  await knex('courses').del();
  
  // Insert sample courses for different branches
  await knex('courses').insert([
    // The Mall Branch - English Courses
    {
      id: 1,
      name: 'Kids Conversation - Beginner',
      code: 'CONV-KIDS-A1',
      course_type: 'conversation_kids',
      branch_id: 1,
      max_students: 8,
      price: 3500.00,
      hours_total: 40
    },
    {
      id: 2,
      name: 'Adults Conversation - Intermediate',
      code: 'CONV-ADULT-B1',
      course_type: 'conversation_adults',
      branch_id: 1,
      max_students: 10,
      price: 4500.00,
      hours_total: 50
    },
    {
      id: 3,
      name: 'English 4 Skills - Foundation',
      code: 'ENG4-FOUND',
      course_type: 'english_4skills',
      branch_id: 1,
      max_students: 12,
      price: 5500.00,
      hours_total: 60
    },
    {
      id: 4,
      name: 'IELTS Preparation - Academic',
      code: 'IELTS-ACAD',
      course_type: 'ielts_prep',
      branch_id: 1,
      max_students: 8,
      price: 8500.00,
      hours_total: 80
    },
    {
      id: 5,
      name: 'TOEIC Preparation - Business',
      code: 'TOEIC-BIZ',
      course_type: 'toeic_prep',
      branch_id: 1,
      max_students: 10,
      price: 7500.00,
      hours_total: 60
    },
    {
      id: 6,
      name: 'TOEFL iBT Preparation',
      code: 'TOEFL-IBT',
      course_type: 'toefl_prep',
      branch_id: 1,
      max_students: 8,
      price: 9500.00,
      hours_total: 80
    },
    
    // The Mall Branch - Chinese Courses
    {
      id: 7,
      name: 'Chinese Conversation - HSK 1',
      code: 'CHI-CONV-HSK1',
      course_type: 'chinese_conversation',
      branch_id: 1,
      max_students: 10,
      price: 4000.00,
      hours_total: 40
    },
    {
      id: 8,
      name: 'Chinese 4 Skills - Beginner',
      code: 'CHI4-BEG',
      course_type: 'chinese_4skills',
      branch_id: 1,
      max_students: 8,
      price: 5000.00,
      hours_total: 50
    }
  ]);

  console.log('✅ Sample courses created successfully!');
  console.log('📚 Created 8 different course types');
  console.log('🌟 Includes English and Chinese courses');
  console.log('💰 Price range: 3,500 - 9,500 THB');
};