/**
 * Seed data for e-books and sample system data
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Clear existing entries
  await knex('book_borrowings').del();
  await knex('ebooks').del();
  
  // Insert e-books
  await knex('ebooks').insert([
    // Conversation Books
    {
      id: 1,
      title: 'English Conversation for Beginners',
      author: 'Sarah Johnson',
      isbn: '978-0123456789',
      category: 'conversation',
      level: 'A1',
      stock_quantity: 25,
      borrowed_count: 0,
      price: 350.00,
      description: 'Basic conversation patterns and everyday expressions'
    },
    {
      id: 2,
      title: 'Intermediate English Conversations',
      author: 'Michael Brown',
      isbn: '978-0987654321',
      category: 'conversation',
      level: 'B1',
      stock_quantity: 20,
      borrowed_count: 0,
      price: 450.00,
      description: 'Real-life conversations for intermediate learners'
    },
    {
      id: 3,
      title: 'Business English Conversations',
      author: 'Jennifer Davis',
      isbn: '978-0456789123',
      category: 'business',
      level: 'B2',
      stock_quantity: 15,
      borrowed_count: 0,
      price: 650.00,
      description: 'Professional English for workplace communication'
    },

    // Grammar Books
    {
      id: 4,
      title: 'Essential English Grammar',
      author: 'David Wilson',
      isbn: '978-0789123456',
      category: 'grammar',
      level: 'A2',
      stock_quantity: 30,
      borrowed_count: 0,
      price: 420.00,
      description: 'Comprehensive grammar guide with exercises'
    },
    {
      id: 5,
      title: 'Advanced Grammar in Use',
      author: 'Cambridge University Press',
      isbn: '978-0321654987',
      category: 'grammar',
      level: 'C1',
      stock_quantity: 12,
      borrowed_count: 0,
      price: 750.00,
      description: 'Advanced grammar for upper-intermediate learners'
    },

    // Vocabulary Books
    {
      id: 6,
      title: '4000 Essential English Words',
      author: 'Paul Nation',
      isbn: '978-0159753486',
      category: 'vocabulary',
      level: 'B1',
      stock_quantity: 25,
      borrowed_count: 0,
      price: 580.00,
      description: 'High-frequency vocabulary for intermediate learners'
    },
    {
      id: 7,
      title: 'Academic Vocabulary in Use',
      author: 'Cambridge Academic',
      isbn: '978-0741852963',
      category: 'academic',
      level: 'B2',
      stock_quantity: 18,
      borrowed_count: 0,
      price: 680.00,
      description: 'Essential vocabulary for academic contexts'
    },

    // Test Preparation Books
    {
      id: 8,
      title: 'IELTS Academic Practice Tests',
      author: 'IELTS Experts',
      isbn: '978-0852741963',
      category: 'test_prep',
      level: 'B2',
      stock_quantity: 20,
      borrowed_count: 0,
      price: 850.00,
      description: 'Complete practice tests for IELTS Academic'
    },
    {
      id: 9,
      title: 'TOEIC Official Test Collection',
      author: 'ETS',
      isbn: '978-0963852741',
      category: 'test_prep',
      level: 'B1',
      stock_quantity: 15,
      borrowed_count: 0,
      price: 920.00,
      description: 'Official TOEIC practice tests and strategies'
    },
    {
      id: 10,
      title: 'TOEFL iBT Complete Guide',
      author: 'Princeton Review',
      isbn: '978-0741963852',
      category: 'test_prep',
      level: 'B2',
      stock_quantity: 12,
      borrowed_count: 0,
      price: 1150.00,
      description: 'Comprehensive TOEFL iBT preparation guide'
    },

    // Children's Books
    {
      id: 11,
      title: 'Fun English for Kids Level 1',
      author: 'Kids Learning Team',
      isbn: '978-0159357486',
      category: 'children',
      level: 'A1',
      stock_quantity: 35,
      borrowed_count: 0,
      price: 280.00,
      description: 'Engaging English activities for young learners'
    },
    {
      id: 12,
      title: 'English Stories for Children',
      author: 'Story Writers',
      isbn: '978-0486159753',
      category: 'children',
      level: 'A2',
      stock_quantity: 40,
      borrowed_count: 0,
      price: 320.00,
      description: 'Illustrated stories to improve reading skills'
    },

    // General English
    {
      id: 13,
      title: 'New English File Elementary',
      author: 'Oxford University Press',
      isbn: '978-0194518789',
      category: 'general',
      level: 'A2',
      stock_quantity: 22,
      borrowed_count: 0,
      price: 650.00,
      description: 'Complete course for elementary English learners'
    },
    {
      id: 14,
      title: 'English in Mind Intermediate',
      author: 'Cambridge University Press',
      isbn: '978-0521750196',
      category: 'general',
      level: 'B1',
      stock_quantity: 18,
      borrowed_count: 0,
      price: 720.00,
      description: 'Comprehensive intermediate English course'
    },
    {
      id: 15,
      title: 'American English Culture Guide',
      author: 'Cultural Learning Institute',
      isbn: '978-0987456123',
      category: 'general',
      level: 'B2',
      stock_quantity: 10,
      borrowed_count: 0,
      price: 580.00,
      description: 'Understanding American culture through English'
    }
  ]);

  console.log('✅ E-books seeded successfully - 15 books added to library');
};