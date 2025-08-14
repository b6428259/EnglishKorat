/**
 * Comprehensive Pricing System Seed Data
 * Populates the pricing structure with all the required data:
 * - Course categories (Conversation, IELTS/TOEFL Promotion)
 * - Duration options (40, 50, 60 hours)
 * - Pricing tiers (Individual, Pair, Group)
 * - Complete pricing matrix as specified in requirements
 */

exports.seed = async function(knex) {
  // Clear existing data (in reverse order of dependencies)
  await knex('course_pricing').del();
  await knex('course_categories').del();
  await knex('pricing_tiers').del();
  await knex('course_durations').del();

  // Insert course durations
  const durations = await knex('course_durations').insert([
    {
      id: 1,
      hours: 40,
      name: '40 Hours',
      is_premium: false,
      description: 'Standard 40-hour course duration',
      active: true
    },
    {
      id: 2,
      hours: 50,
      name: '50 Hours',
      is_premium: false,
      description: 'Extended 50-hour course duration',
      active: true
    },
    {
      id: 3,
      hours: 60,
      name: '60 Hours Premium',
      is_premium: true,
      description: 'Premium 60-hour course duration with enhanced features',
      active: true
    }
  ]);

  // Insert pricing tiers
  const tiers = await knex('pricing_tiers').insert([
    {
      id: 1,
      tier_type: 'individual',
      display_name: 'Individual',
      min_students: 1,
      max_students: 1,
      sort_order: 1,
      active: true
    },
    {
      id: 2,
      tier_type: 'pair',
      display_name: 'Pair',
      min_students: 2,
      max_students: 2,
      sort_order: 2,
      active: true
    },
    {
      id: 3,
      tier_type: 'group',
      display_name: 'Group (3-4 people)',
      min_students: 3,
      max_students: 4,
      sort_order: 3,
      active: true
    }
  ]);

  // Update existing categories or insert new ones for pricing
  const existingCategories = await knex('course_categories').select('*');
  
  // Insert or update our pricing categories
  const conversationCategoryId = 9; // Use ID 9 to avoid conflicts
  const ieltsToefePrmoId = 10; // Use ID 10 to avoid conflicts
  
  await knex('course_categories').insert([
    {
      id: conversationCategoryId,
      name: 'Conversation Course (Thai & Native Teacher)',
      name_en: 'Conversation Course (Thai & Native Teacher)',
      code: 'conversation',
      description: 'Conversational English courses with Thai and Native teachers',
      description_en: 'Conversational English courses with Thai and Native teachers',
      type: 'conversation',
      includes_book_fee: true,
      default_book_fee: 900.00,
      active: true
    },
    {
      id: ieltsToefePrmoId,
      name: 'IELTS/TOEFL Promotion Courses',
      name_en: 'IELTS/TOEFL Promotion Courses',  
      code: 'ielts_toefl_promo',
      description: 'IELTS and TOEFL test preparation courses with promotional pricing',
      description_en: 'IELTS and TOEFL test preparation courses with promotional pricing',
      type: 'test_prep',
      includes_book_fee: true,
      default_book_fee: 900.00,
      active: true
    }
  ]);

  // Insert comprehensive pricing matrix using the correct category IDs
  const pricingData = [
    // CONVERSATION COURSE PRICING (Category ID: 9)
    // 40 Hours
    { category_id: conversationCategoryId, duration_id: 1, pricing_tier_id: 1, base_price: 33600, book_fee: 900, total_price: 34500, price_per_hour_per_person: 840 },
    { category_id: conversationCategoryId, duration_id: 1, pricing_tier_id: 2, base_price: 23000, book_fee: 900, total_price: 23900, price_per_hour_per_person: 575 },
    { category_id: conversationCategoryId, duration_id: 1, pricing_tier_id: 3, base_price: 18500, book_fee: 900, total_price: 19400, price_per_hour_per_person: 475 },
    
    // 50 Hours
    { category_id: conversationCategoryId, duration_id: 2, pricing_tier_id: 1, base_price: 41000, book_fee: 900, total_price: 41900, price_per_hour_per_person: 820 },
    { category_id: conversationCategoryId, duration_id: 2, pricing_tier_id: 2, base_price: 27000, book_fee: 900, total_price: 27900, price_per_hour_per_person: 540 },
    { category_id: conversationCategoryId, duration_id: 2, pricing_tier_id: 3, base_price: 22000, book_fee: 900, total_price: 22900, price_per_hour_per_person: 440 },
    
    // 60 Hours
    { category_id: conversationCategoryId, duration_id: 3, pricing_tier_id: 1, base_price: 47400, book_fee: 900, total_price: 48300, price_per_hour_per_person: 790 },
    { category_id: conversationCategoryId, duration_id: 3, pricing_tier_id: 2, base_price: 28500, book_fee: 900, total_price: 29400, price_per_hour_per_person: 475 },
    { category_id: conversationCategoryId, duration_id: 3, pricing_tier_id: 3, base_price: 24000, book_fee: 900, total_price: 24900, price_per_hour_per_person: 400 },

    // IELTS/TOEFL PROMOTION PRICING (Category ID: 10)
    // 40 Hours
    { category_id: ieltsToefePrmoId, duration_id: 1, pricing_tier_id: 1, base_price: 31000, book_fee: 900, total_price: 31900, price_per_hour_per_person: 775 },
    { category_id: ieltsToefePrmoId, duration_id: 1, pricing_tier_id: 2, base_price: 21200, book_fee: 900, total_price: 22100, price_per_hour_per_person: 530 },
    { category_id: ieltsToefePrmoId, duration_id: 1, pricing_tier_id: 3, base_price: 16800, book_fee: 900, total_price: 17700, price_per_hour_per_person: 420 },
    
    // 50 Hours
    { category_id: ieltsToefePrmoId, duration_id: 2, pricing_tier_id: 1, base_price: 38500, book_fee: 900, total_price: 39400, price_per_hour_per_person: 770 },
    { category_id: ieltsToefePrmoId, duration_id: 2, pricing_tier_id: 2, base_price: 26250, book_fee: 900, total_price: 27150, price_per_hour_per_person: 525 },
    { category_id: ieltsToefePrmoId, duration_id: 2, pricing_tier_id: 3, base_price: 20500, book_fee: 900, total_price: 21400, price_per_hour_per_person: 410 },
    
    // 60 Hours Premium (No book fee for premium)
    { category_id: ieltsToefePrmoId, duration_id: 3, pricing_tier_id: 1, base_price: 45000, book_fee: 0, total_price: 45000, price_per_hour_per_person: 750 },
    { category_id: ieltsToefePrmoId, duration_id: 3, pricing_tier_id: 2, base_price: 30000, book_fee: 0, total_price: 30000, price_per_hour_per_person: 500 },
    { category_id: ieltsToefePrmoId, duration_id: 3, pricing_tier_id: 3, base_price: 24000, book_fee: 0, total_price: 24000, price_per_hour_per_person: 400 }
  ];

  // Add notes for special pricing
  pricingData.forEach(item => {
    if (item.category_id === ieltsToefePrmoId && item.duration_id === 3) {
      item.notes = 'Premium pricing - Book fee included in base price';
    } else {
      item.notes = 'Standard pricing structure with separate book fee';
    }
    item.active = true;
  });

  await knex('course_pricing').insert(pricingData);

  console.log('✅ Comprehensive pricing system data seeded successfully');
  console.log('📊 Pricing Matrix Summary:');
  console.log('   - Conversation Courses: 9 pricing combinations (3 durations × 3 tiers)');
  console.log('   - IELTS/TOEFL Promotion: 9 pricing combinations (3 durations × 3 tiers)');
  console.log('   - Total: 18 pricing combinations');
  console.log('   - Book fee: 900 THB (waived for 60-hour premium courses)');
};