/**
 * Comprehensive seed data for branch-specific courses
 * Branch 1 (The Mall): 31 course types
 * Branch 3 (Techno): 25 course types  
 * Online: 15 course types
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Get branches and categories
  const branches = await knex('branches').select('*');
  const categories = await knex('course_categories').select('*');
  
  if (branches.length === 0 || categories.length === 0) {
    console.log('Need branches and categories first - skipping comprehensive courses');
    return;
  }

  // Clear existing courses
  await knex('courses').del();

  const courses = [];
  let courseId = 1;

  // Helper function to create course
  const createCourse = (name, code, courseType, branchId, categoryId, maxStudents, price, hours, description = '') => {
    return {
      id: courseId++,
      name,
      code,
      course_type: courseType,
      branch_id: branchId,
      category_id: categoryId,
      max_students: maxStudents,
      price,
      hours_total: hours,
      description,
      status: 'active'
    };
  };

  // Branch 1 - The Mall Branch (31 course types)
  const mallBranch = branches.find(b => b.code === 'MALL');
  if (mallBranch) {
    // Kids Conversation (5 courses)
    courses.push(createCourse('Kids Conversation A1', 'MALL-CONV-K-A1', 'conversation_kids', mallBranch.id, 1, 8, 3500, 40, 'Beginner level conversation for kids aged 6-10'));
    courses.push(createCourse('Kids Conversation A2', 'MALL-CONV-K-A2', 'conversation_kids', mallBranch.id, 1, 8, 3800, 40, 'Elementary level conversation for kids aged 8-12'));
    courses.push(createCourse('Kids Conversation B1', 'MALL-CONV-K-B1', 'conversation_kids', mallBranch.id, 1, 8, 4200, 50, 'Intermediate level conversation for kids aged 10-14'));
    courses.push(createCourse('Kids Conversation B2', 'MALL-CONV-K-B2', 'conversation_kids', mallBranch.id, 1, 6, 4800, 60, 'Upper-intermediate conversation for kids aged 12-16'));
    courses.push(createCourse('Kids Advanced Conversation', 'MALL-CONV-K-ADV', 'conversation_kids', mallBranch.id, 1, 6, 5200, 60, 'Advanced conversation for teenagers'));

    // Adults Conversation (6 courses)
    courses.push(createCourse('Adults Conversation A1', 'MALL-CONV-A-A1', 'conversation_adults', mallBranch.id, 2, 10, 4500, 40, 'Basic conversation for adults'));
    courses.push(createCourse('Adults Conversation A2', 'MALL-CONV-A-A2', 'conversation_adults', mallBranch.id, 2, 10, 4800, 50, 'Elementary conversation for adults'));
    courses.push(createCourse('Adults Conversation B1', 'MALL-CONV-A-B1', 'conversation_adults', mallBranch.id, 2, 8, 5200, 50, 'Intermediate conversation for adults'));
    courses.push(createCourse('Adults Conversation B2', 'MALL-CONV-A-B2', 'conversation_adults', mallBranch.id, 2, 8, 5800, 60, 'Upper-intermediate conversation'));
    courses.push(createCourse('Business Conversation', 'MALL-CONV-BIZ', 'conversation_adults', mallBranch.id, 2, 6, 7500, 60, 'Business English conversation'));
    courses.push(createCourse('Travel Conversation', 'MALL-CONV-TRAVEL', 'conversation_adults', mallBranch.id, 2, 8, 5500, 40, 'English for travelers'));

    // English 4 Skills (5 courses)
    courses.push(createCourse('English 4 Skills Foundation', 'MALL-4SKILL-FOUND', 'english_4skills', mallBranch.id, 3, 12, 5500, 60, 'Foundation level 4 skills'));
    courses.push(createCourse('English 4 Skills Elementary', 'MALL-4SKILL-ELEM', 'english_4skills', mallBranch.id, 3, 12, 6000, 60, 'Elementary level 4 skills'));
    courses.push(createCourse('English 4 Skills Intermediate', 'MALL-4SKILL-INT', 'english_4skills', mallBranch.id, 3, 10, 6500, 80, 'Intermediate level 4 skills'));
    courses.push(createCourse('English 4 Skills Upper-Int', 'MALL-4SKILL-UPPER', 'english_4skills', mallBranch.id, 3, 10, 7200, 80, 'Upper-intermediate 4 skills'));
    courses.push(createCourse('English 4 Skills Advanced', 'MALL-4SKILL-ADV', 'english_4skills', mallBranch.id, 3, 8, 8000, 100, 'Advanced level 4 skills'));

    // Test Preparation (9 courses)
    courses.push(createCourse('IELTS Academic Foundation', 'MALL-IELTS-ACAD-FOUND', 'ielts_prep', mallBranch.id, 4, 8, 8500, 80, 'IELTS Academic preparation'));
    courses.push(createCourse('IELTS Academic Intensive', 'MALL-IELTS-ACAD-INT', 'ielts_prep', mallBranch.id, 4, 6, 12000, 100, 'Intensive IELTS Academic'));
    courses.push(createCourse('IELTS General Training', 'MALL-IELTS-GT', 'ielts_prep', mallBranch.id, 4, 8, 7500, 60, 'IELTS General Training'));
    courses.push(createCourse('TOEIC Foundation', 'MALL-TOEIC-FOUND', 'toeic_prep', mallBranch.id, 5, 10, 6500, 60, 'TOEIC preparation foundation'));
    courses.push(createCourse('TOEIC Intensive', 'MALL-TOEIC-INT', 'toeic_prep', mallBranch.id, 5, 8, 9500, 80, 'Intensive TOEIC preparation'));
    courses.push(createCourse('TOEFL iBT Foundation', 'MALL-TOEFL-FOUND', 'toefl_prep', mallBranch.id, 6, 8, 9500, 80, 'TOEFL iBT preparation'));
    courses.push(createCourse('TOEFL iBT Intensive', 'MALL-TOEFL-INT', 'toefl_prep', mallBranch.id, 6, 6, 15000, 120, 'Intensive TOEFL iBT'));
    courses.push(createCourse('University Prep', 'MALL-UNI-PREP', 'toefl_prep', mallBranch.id, 6, 8, 12000, 100, 'University entrance preparation'));
    courses.push(createCourse('Scholarship Prep', 'MALL-SCHOLAR-PREP', 'ielts_prep', mallBranch.id, 4, 6, 18000, 150, 'Scholarship application preparation'));

    // Chinese Courses (4 courses)
    courses.push(createCourse('Chinese Conversation Beginner', 'MALL-CHIN-CONV-BEG', 'chinese_conversation', mallBranch.id, 7, 8, 4500, 40, 'Basic Chinese conversation'));
    courses.push(createCourse('Chinese Conversation Intermediate', 'MALL-CHIN-CONV-INT', 'chinese_conversation', mallBranch.id, 7, 6, 6000, 60, 'Intermediate Chinese conversation'));
    courses.push(createCourse('Chinese 4 Skills Foundation', 'MALL-CHIN-4SKILL-FOUND', 'chinese_4skills', mallBranch.id, 8, 10, 7500, 80, 'Chinese 4 skills foundation'));
    courses.push(createCourse('Chinese 4 Skills Advanced', 'MALL-CHIN-4SKILL-ADV', 'chinese_4skills', mallBranch.id, 8, 8, 9500, 100, 'Advanced Chinese 4 skills'));

    // Special Programs (2 courses)
    courses.push(createCourse('Private Tutoring', 'MALL-PRIVATE', 'conversation_adults', mallBranch.id, 2, 1, 800, 1, 'One-on-one private lessons (per hour)'));
    courses.push(createCourse('Corporate Training', 'MALL-CORPORATE', 'conversation_adults', mallBranch.id, 2, 15, 25000, 60, 'Corporate English training'));
  }

  // Branch 3 - Technology Branch (25 course types)
  const techBranch = branches.find(b => b.code === 'TECH');
  if (techBranch) {
    // Kids Conversation (4 courses)
    courses.push(createCourse('Kids Conversation A1', 'TECH-CONV-K-A1', 'conversation_kids', techBranch.id, 1, 8, 3200, 40, 'Beginner level conversation for kids'));
    courses.push(createCourse('Kids Conversation A2', 'TECH-CONV-K-A2', 'conversation_kids', techBranch.id, 1, 8, 3500, 40, 'Elementary level conversation for kids'));
    courses.push(createCourse('Kids Conversation B1', 'TECH-CONV-K-B1', 'conversation_kids', techBranch.id, 1, 8, 3800, 50, 'Intermediate level conversation for kids'));
    courses.push(createCourse('Teen Advanced Conversation', 'TECH-CONV-TEEN-ADV', 'conversation_kids', techBranch.id, 1, 6, 4500, 60, 'Advanced conversation for teenagers'));

    // Adults Conversation (5 courses)
    courses.push(createCourse('Adults Conversation A1', 'TECH-CONV-A-A1', 'conversation_adults', techBranch.id, 2, 10, 4200, 40, 'Basic conversation for adults'));
    courses.push(createCourse('Adults Conversation A2', 'TECH-CONV-A-A2', 'conversation_adults', techBranch.id, 2, 10, 4500, 50, 'Elementary conversation for adults'));
    courses.push(createCourse('Adults Conversation B1', 'TECH-CONV-A-B1', 'conversation_adults', techBranch.id, 2, 8, 4800, 50, 'Intermediate conversation for adults'));
    courses.push(createCourse('Adults Conversation B2', 'TECH-CONV-A-B2', 'conversation_adults', techBranch.id, 2, 8, 5500, 60, 'Upper-intermediate conversation'));
    courses.push(createCourse('Professional English', 'TECH-CONV-PROF', 'conversation_adults', techBranch.id, 2, 6, 6500, 60, 'Professional English conversation'));

    // English 4 Skills (4 courses)
    courses.push(createCourse('English 4 Skills Foundation', 'TECH-4SKILL-FOUND', 'english_4skills', techBranch.id, 3, 12, 5200, 60, 'Foundation level 4 skills'));
    courses.push(createCourse('English 4 Skills Elementary', 'TECH-4SKILL-ELEM', 'english_4skills', techBranch.id, 3, 12, 5800, 60, 'Elementary level 4 skills'));
    courses.push(createCourse('English 4 Skills Intermediate', 'TECH-4SKILL-INT', 'english_4skills', techBranch.id, 3, 10, 6200, 80, 'Intermediate level 4 skills'));
    courses.push(createCourse('English 4 Skills Advanced', 'TECH-4SKILL-ADV', 'english_4skills', techBranch.id, 3, 8, 7500, 100, 'Advanced level 4 skills'));

    // Test Preparation (7 courses)
    courses.push(createCourse('IELTS Academic Prep', 'TECH-IELTS-ACAD', 'ielts_prep', techBranch.id, 4, 8, 8000, 80, 'IELTS Academic preparation'));
    courses.push(createCourse('IELTS General Training', 'TECH-IELTS-GT', 'ielts_prep', techBranch.id, 4, 8, 7000, 60, 'IELTS General Training'));
    courses.push(createCourse('TOEIC Foundation', 'TECH-TOEIC-FOUND', 'toeic_prep', techBranch.id, 5, 10, 6000, 60, 'TOEIC preparation foundation'));
    courses.push(createCourse('TOEIC Intensive', 'TECH-TOEIC-INT', 'toeic_prep', techBranch.id, 5, 8, 9000, 80, 'Intensive TOEIC preparation'));
    courses.push(createCourse('TOEFL iBT Prep', 'TECH-TOEFL', 'toefl_prep', techBranch.id, 6, 8, 9000, 80, 'TOEFL iBT preparation'));
    courses.push(createCourse('University Entrance', 'TECH-UNI-ENT', 'toefl_prep', techBranch.id, 6, 8, 11000, 100, 'University entrance preparation'));
    courses.push(createCourse('Academic English', 'TECH-ACADEMIC', 'english_4skills', techBranch.id, 3, 6, 8500, 80, 'Academic English skills'));

    // Chinese Courses (3 courses)
    courses.push(createCourse('Chinese Conversation Basic', 'TECH-CHIN-CONV-BASIC', 'chinese_conversation', techBranch.id, 7, 8, 4200, 40, 'Basic Chinese conversation'));
    courses.push(createCourse('Chinese Conversation Intermediate', 'TECH-CHIN-CONV-INT', 'chinese_conversation', techBranch.id, 7, 6, 5500, 60, 'Intermediate Chinese conversation'));
    courses.push(createCourse('Chinese 4 Skills', 'TECH-CHIN-4SKILL', 'chinese_4skills', techBranch.id, 8, 10, 7000, 80, 'Chinese 4 skills course'));

    // Special Programs (2 courses)
    courses.push(createCourse('Private Tutoring', 'TECH-PRIVATE', 'conversation_adults', techBranch.id, 2, 1, 750, 1, 'One-on-one private lessons (per hour)'));
    courses.push(createCourse('Evening Classes', 'TECH-EVENING', 'conversation_adults', techBranch.id, 2, 8, 4800, 50, 'Evening English classes for working professionals'));
  }

  // Online Branch (15 course types)
  const onlineBranch = branches.find(b => b.code === 'ONLINE');
  if (onlineBranch) {
    // Online Conversation (4 courses)
    courses.push(createCourse('Online Kids Conversation', 'ONLINE-CONV-KIDS', 'conversation_kids', onlineBranch.id, 1, 6, 3000, 40, 'Online conversation for kids'));
    courses.push(createCourse('Online Adults Conversation A1-A2', 'ONLINE-CONV-A-BASIC', 'conversation_adults', onlineBranch.id, 2, 8, 4000, 40, 'Basic online conversation for adults'));
    courses.push(createCourse('Online Adults Conversation B1-B2', 'ONLINE-CONV-A-INT', 'conversation_adults', onlineBranch.id, 2, 8, 4500, 50, 'Intermediate online conversation'));
    courses.push(createCourse('Online Business English', 'ONLINE-CONV-BIZ', 'conversation_adults', onlineBranch.id, 2, 6, 6000, 60, 'Online business English'));

    // Online 4 Skills (3 courses)
    courses.push(createCourse('Online English 4 Skills Basic', 'ONLINE-4SKILL-BASIC', 'english_4skills', onlineBranch.id, 3, 10, 4800, 60, 'Basic online 4 skills'));
    courses.push(createCourse('Online English 4 Skills Intermediate', 'ONLINE-4SKILL-INT', 'english_4skills', onlineBranch.id, 3, 8, 5500, 80, 'Intermediate online 4 skills'));
    courses.push(createCourse('Online English 4 Skills Advanced', 'ONLINE-4SKILL-ADV', 'english_4skills', onlineBranch.id, 3, 6, 6500, 100, 'Advanced online 4 skills'));

    // Online Test Preparation (5 courses)
    courses.push(createCourse('Online IELTS Academic', 'ONLINE-IELTS-ACAD', 'ielts_prep', onlineBranch.id, 4, 6, 7500, 80, 'Online IELTS Academic preparation'));
    courses.push(createCourse('Online IELTS General', 'ONLINE-IELTS-GT', 'ielts_prep', onlineBranch.id, 4, 6, 6500, 60, 'Online IELTS General Training'));
    courses.push(createCourse('Online TOEIC Prep', 'ONLINE-TOEIC', 'toeic_prep', onlineBranch.id, 5, 8, 5500, 60, 'Online TOEIC preparation'));
    courses.push(createCourse('Online TOEFL iBT', 'ONLINE-TOEFL', 'toefl_prep', onlineBranch.id, 6, 6, 8500, 80, 'Online TOEFL iBT preparation'));
    courses.push(createCourse('Online University Prep', 'ONLINE-UNI-PREP', 'toefl_prep', onlineBranch.id, 6, 6, 10000, 100, 'Online university preparation'));

    // Online Chinese (2 courses)
    courses.push(createCourse('Online Chinese Conversation', 'ONLINE-CHIN-CONV', 'chinese_conversation', onlineBranch.id, 7, 6, 4000, 40, 'Online Chinese conversation'));
    courses.push(createCourse('Online Chinese 4 Skills', 'ONLINE-CHIN-4SKILL', 'chinese_4skills', onlineBranch.id, 8, 8, 6000, 80, 'Online Chinese 4 skills'));

    // Online Special Program (1 course)
    courses.push(createCourse('Online Private Tutoring', 'ONLINE-PRIVATE', 'conversation_adults', onlineBranch.id, 2, 1, 600, 1, 'Online one-on-one private lessons (per hour)'));
  }

  // Insert all courses
  await knex('courses').insert(courses);

  console.log(`✅ Inserted ${courses.length} comprehensive courses`);
  console.log(`   - Branch 1 (The Mall): ${courses.filter(c => c.branch_id === mallBranch?.id).length} courses`);
  console.log(`   - Branch 3 (Techno): ${courses.filter(c => c.branch_id === techBranch?.id).length} courses`);
  console.log(`   - Online Branch: ${courses.filter(c => c.branch_id === onlineBranch?.id).length} courses`);
};