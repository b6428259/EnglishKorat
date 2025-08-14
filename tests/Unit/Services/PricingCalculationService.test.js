/**
 * Focused tests for the comprehensive pricing system
 * Tests the core pricing calculations and business logic
 */

const { db } = require('../src/config/database');
const PricingCalculationService = require('../src/services/PricingCalculationService');

describe('Comprehensive Pricing System', () => {
  
  beforeAll(async () => {
    // Ensure database is connected
    await db.raw('SELECT 1');
  });

  afterAll(async () => {
    // Clean up database connection
    await db.destroy();
  });

  describe('Pricing Calculation Service', () => {
    
    test('should calculate Conversation Course 40h Individual pricing correctly', async () => {
      const result = await PricingCalculationService.calculateCoursePricing(9, 1, 1);
      
      expect(result.totalPrice).toBe(34500);
      expect(result.basePrice).toBe(33600);
      expect(result.bookFee).toBe(900);
      expect(result.pricePerHourPerPerson).toBe(840);
      expect(result.category.code).toBe('conversation');
    });

    test('should calculate IELTS/TOEFL 60h Premium pricing with no book fee', async () => {
      const result = await PricingCalculationService.calculateCoursePricing(10, 3, 2); // Pair
      
      expect(result.totalPrice).toBe(30000);
      expect(result.basePrice).toBe(30000);
      expect(result.bookFee).toBe(0); // No book fee for premium
      expect(result.pricePerHourPerPerson).toBe(500);
    });

    test('should apply discount correctly', async () => {
      const result = await PricingCalculationService.calculateCoursePricing(9, 1, 3, { 
        discountPercentage: 10 
      });
      
      const expectedDiscount = 19400 * 0.1; // 10% of total price
      expect(result.discountAmount).toBe(expectedDiscount);
      expect(result.finalPrice).toBe(19400 - expectedDiscount);
    });

    test('should waive book fee when requested', async () => {
      const result = await PricingCalculationService.calculateCoursePricing(9, 2, 1, { 
        waiveBookFee: true 
      });
      
      expect(result.bookFee).toBe(0);
      expect(result.totalPrice).toBe(41000); // Base price only
    });

    test('should determine correct pricing tier for group sizes', async () => {
      const individual = await PricingCalculationService.determinePricingTier(1);
      const pair = await PricingCalculationService.determinePricingTier(2);
      const group = await PricingCalculationService.determinePricingTier(3);
      const groupLarge = await PricingCalculationService.determinePricingTier(4);

      expect(individual.tier_type).toBe('individual');
      expect(pair.tier_type).toBe('pair');
      expect(group.tier_type).toBe('group');
      expect(groupLarge.tier_type).toBe('group'); // 4 students still in group tier
    });

    test('should get all pricing options for a course configuration', async () => {
      const options = await PricingCalculationService.getAvailablePricingOptions(9, 1); // Conversation 40h
      
      expect(options).toHaveLength(3); // Individual, Pair, Group
      expect(options[0].totalPrice).toBe(34500); // Individual
      expect(options[1].totalPrice).toBe(23900); // Pair
      expect(options[2].totalPrice).toBe(19400); // Group
    });

    test('should calculate potential savings correctly', async () => {
      const savings = await PricingCalculationService.calculatePotentialSavings(9, 1, 1, 3);
      
      expect(savings.currentPricePerStudent).toBe(34500); // Individual price
      expect(savings.newPricePerStudent).toBe(19400); // Group price
      expect(savings.savingsPerStudent).toBe(15100); // Difference
      expect(parseFloat(savings.percentageSavings)).toBeCloseTo(43.77, 1); // ~44% savings
    });

    test('should provide comprehensive pricing summary', async () => {
      const summary = await PricingCalculationService.getCoursePricingSummary(10, 2); // IELTS 50h
      
      expect(summary.category.code).toBe('ielts_toefl_promo');
      expect(summary.duration.hours).toBe(50);
      expect(summary.pricingOptions).toHaveLength(3);
      expect(summary.summary.lowestPrice).toBe(21400); // Group price
      expect(summary.summary.highestPrice).toBe(39400); // Individual price
    });
  });

  describe('Pricing Business Rules', () => {
    
    test('should enforce conversation course pricing structure', async () => {
      // Test all conversation course combinations
      const conversations = [
        { duration: 1, tier: 1, expected: 34500 }, // 40h Individual
        { duration: 1, tier: 2, expected: 23900 }, // 40h Pair
        { duration: 1, tier: 3, expected: 19400 }, // 40h Group
        { duration: 2, tier: 1, expected: 41900 }, // 50h Individual
        { duration: 2, tier: 2, expected: 27900 }, // 50h Pair
        { duration: 2, tier: 3, expected: 22900 }, // 50h Group
        { duration: 3, tier: 1, expected: 48300 }, // 60h Individual
        { duration: 3, tier: 2, expected: 29400 }, // 60h Pair
        { duration: 3, tier: 3, expected: 24900 }, // 60h Group
      ];

      for (const test of conversations) {
        const result = await PricingCalculationService.calculateCoursePricing(9, test.duration, test.tier === 1 ? 1 : test.tier === 2 ? 2 : 3);
        expect(result.totalPrice).toBe(test.expected);
      }
    });

    test('should enforce IELTS/TOEFL promotion pricing structure', async () => {
      // Test key IELTS/TOEFL combinations
      const ieltsTests = [
        { duration: 1, groupSize: 1, expected: 31900 }, // 40h Individual
        { duration: 1, groupSize: 3, expected: 17700 }, // 40h Group
        { duration: 3, groupSize: 1, expected: 45000 }, // 60h Premium Individual (no book fee)
        { duration: 3, groupSize: 3, expected: 24000 }, // 60h Premium Group (no book fee)
      ];

      for (const test of ieltsTests) {
        const result = await PricingCalculationService.calculateCoursePricing(10, test.duration, test.groupSize);
        expect(result.totalPrice).toBe(test.expected);
      }
    });

    test('should handle book fee rules correctly', async () => {
      // Regular courses have book fee
      const regular = await PricingCalculationService.calculateCoursePricing(9, 1, 1);
      expect(regular.bookFee).toBe(900);

      // Premium courses (60h IELTS/TOEFL) have no book fee
      const premium = await PricingCalculationService.calculateCoursePricing(10, 3, 1);
      expect(premium.bookFee).toBe(0);
    });

    test('should validate group size boundaries', async () => {
      // Test edge cases
      expect(async () => {
        await PricingCalculationService.calculateCoursePricing(9, 1, 0); // 0 students
      }).rejects.toThrow();

      expect(async () => {
        await PricingCalculationService.calculateCoursePricing(9, 1, 5); // More than max group
      }).rejects.toThrow();
    });
  });

  describe('Price Calculation Accuracy', () => {
    
    test('should calculate per-hour rates correctly', async () => {
      // Test conversation 40h individual: 34500 / 40 = 862.5 per hour total, 840 per person
      const conv40Individual = await PricingCalculationService.calculateCoursePricing(9, 1, 1);
      expect(conv40Individual.pricePerHourPerPerson).toBe(840);

      // Test IELTS 60h group: 24000 / 60 = 400 per hour per person
      const ielts60Group = await PricingCalculationService.calculateCoursePricing(10, 3, 3);
      expect(ielts60Group.pricePerHourPerPerson).toBe(400);
    });

    test('should show correct price breakdowns', async () => {
      const result = await PricingCalculationService.calculateCoursePricing(9, 2, 2); // Conversation 50h Pair
      
      expect(result.basePrice).toBe(27000);
      expect(result.bookFee).toBe(900);
      expect(result.totalPrice).toBe(27900);
      expect(result.basePrice + result.bookFee).toBe(result.totalPrice);
    });
  });
});

module.exports = {};