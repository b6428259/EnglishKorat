/**
 * Unit Tests for Course Model
 * Tests the Course model functionality including validation, pricing, and enrollment logic
 */

const Course = require('../../../models/Course');

describe('Course Model', () => {
  describe('Course Creation and Validation', () => {
    test('should create a valid course with required fields', () => {
      const courseData = {
        name: 'IELTS Preparation',
        course_type: 'ielts_preparation',
        level: 'intermediate',
        total_hours: 60,
        price_per_hour: 300,
        max_students: 8,
        min_students: 3,
        branch_id: 1
      };

      const course = new Course(courseData);
      expect(course.name).toBe('IELTS Preparation');
      expect(course.course_type).toBe('ielts_preparation');
      expect(course.level).toBe('intermediate');
      expect(course.total_hours).toBe(60);
      expect(course.price_per_hour).toBe(300);
      expect(course.max_students).toBe(8);
      expect(course.min_students).toBe(3);
      expect(course.branch_id).toBe(1);
    });

    test('should calculate total price correctly', () => {
      const course = new Course({
        name: 'Test Course',
        course_type: 'adults_conversation',
        level: 'beginner',
        total_hours: 40,
        price_per_hour: 250,
        max_students: 6,
        min_students: 3,
        branch_id: 1
      });

      expect(course.getTotalPrice()).toBe(10000);
    });

    test('should validate course type', () => {
      const validTypes = [
        'kids_conversation',
        'adults_conversation',
        'english_4_skills',
        'ielts_preparation',
        'toeic_preparation',
        'toefl_preparation',
        'chinese_conversation',
        'chinese_4_skills'
      ];

      validTypes.forEach(type => {
        const course = new Course({
          name: 'Test Course',
          course_type: type,
          level: 'beginner',
          total_hours: 40,
          price_per_hour: 250,
          max_students: 6,
          min_students: 3,
          branch_id: 1
        });
        expect(course.course_type).toBe(type);
      });

      expect(() => {
        new Course({
          name: 'Test Course',
          course_type: 'invalid_type',
          level: 'beginner',
          total_hours: 40,
          price_per_hour: 250,
          max_students: 6,
          min_students: 3,
          branch_id: 1
        });
      }).toThrow('Invalid course type');
    });

    test('should validate course level', () => {
      const validLevels = ['beginner', 'intermediate', 'advanced'];

      validLevels.forEach(level => {
        const course = new Course({
          name: 'Test Course',
          course_type: 'adults_conversation',
          level: level,
          total_hours: 40,
          price_per_hour: 250,
          max_students: 6,
          min_students: 3,
          branch_id: 1
        });
        expect(course.level).toBe(level);
      });

      expect(() => {
        new Course({
          name: 'Test Course',
          course_type: 'adults_conversation',
          level: 'expert',
          total_hours: 40,
          price_per_hour: 250,
          max_students: 6,
          min_students: 3,
          branch_id: 1
        });
      }).toThrow('Invalid course level');
    });

    test('should validate positive values for hours and pricing', () => {
      expect(() => {
        new Course({
          name: 'Test Course',
          course_type: 'adults_conversation',
          level: 'beginner',
          total_hours: -10,
          price_per_hour: 250,
          max_students: 6,
          min_students: 3,
          branch_id: 1
        });
      }).toThrow('Total hours must be positive');

      expect(() => {
        new Course({
          name: 'Test Course',
          course_type: 'adults_conversation',
          level: 'beginner',
          total_hours: 40,
          price_per_hour: -100,
          max_students: 6,
          min_students: 3,
          branch_id: 1
        });
      }).toThrow('Price per hour must be positive');
    });

    test('should validate student capacity constraints', () => {
      expect(() => {
        new Course({
          name: 'Test Course',
          course_type: 'adults_conversation',
          level: 'beginner',
          total_hours: 40,
          price_per_hour: 250,
          max_students: 2,
          min_students: 5,
          branch_id: 1
        });
      }).toThrow('Maximum students must be greater than minimum students');

      expect(() => {
        new Course({
          name: 'Test Course',
          course_type: 'adults_conversation',
          level: 'beginner',
          total_hours: 40,
          price_per_hour: 250,
          max_students: 0,
          min_students: 1,
          branch_id: 1
        });
      }).toThrow('Maximum students must be at least 1');
    });
  });

  describe('Course Business Logic', () => {
    let course;

    beforeEach(() => {
      course = new Course({
        name: 'IELTS Preparation',
        course_type: 'ielts_preparation',
        level: 'intermediate',
        total_hours: 60,
        price_per_hour: 300,
        max_students: 8,
        min_students: 3,
        branch_id: 1
      });
    });

    test('should check if course can start based on enrollment', () => {
      // Mock enrolled students count
      course.setEnrolledCount(5);
      expect(course.canStart()).toBe(true);

      course.setEnrolledCount(2);
      expect(course.canStart()).toBe(false);

      course.setEnrolledCount(3);
      expect(course.canStart()).toBe(true);
    });

    test('should check if course is full', () => {
      course.setEnrolledCount(8);
      expect(course.isFull()).toBe(true);

      course.setEnrolledCount(7);
      expect(course.isFull()).toBe(false);

      course.setEnrolledCount(9); // Should not be possible but test boundary
      expect(course.isFull()).toBe(true);
    });

    test('should calculate available spots correctly', () => {
      course.setEnrolledCount(5);
      expect(course.getAvailableSpots()).toBe(3);

      course.setEnrolledCount(8);
      expect(course.getAvailableSpots()).toBe(0);

      course.setEnrolledCount(0);
      expect(course.getAvailableSpots()).toBe(8);
    });

    test('should determine if enrollment is available', () => {
      course.setEnrolledCount(7);
      course.status = 'active';
      expect(course.isEnrollmentAvailable()).toBe(true);

      course.setEnrolledCount(8);
      expect(course.isEnrollmentAvailable()).toBe(false);

      course.setEnrolledCount(5);
      course.status = 'inactive';
      expect(course.isEnrollmentAvailable()).toBe(false);
    });

    test('should calculate course duration in weeks', () => {
      // Assuming 2 classes per week, 2 hours each = 4 hours per week
      const weeklyHours = 4;
      const expectedWeeks = Math.ceil(course.total_hours / weeklyHours);
      
      expect(course.calculateDurationWeeks(weeklyHours)).toBe(expectedWeeks);
    });

    test('should estimate completion date', () => {
      const startDate = new Date('2024-02-01');
      const weeklyHours = 4;
      const estimatedCompletion = course.estimateCompletionDate(startDate, weeklyHours);
      
      expect(estimatedCompletion).toBeInstanceOf(Date);
      expect(estimatedCompletion.getTime()).toBeGreaterThan(startDate.getTime());
    });
  });

  describe('Course Pricing Methods', () => {
    let course;

    beforeEach(() => {
      course = new Course({
        name: 'Business English',
        course_type: 'adults_conversation',
        level: 'intermediate',
        total_hours: 40,
        price_per_hour: 350,
        max_students: 6,
        min_students: 3,
        branch_id: 1
      });
    });

    test('should apply early bird discount', () => {
      const discount = 10; // 10%
      const discountedPrice = course.applyDiscount(discount);
      const expectedPrice = course.getTotalPrice() * (1 - discount / 100);
      
      expect(discountedPrice).toBe(expectedPrice);
    });

    test('should calculate price per session', () => {
      const sessionsPerWeek = 2;
      const totalSessions = 20; // Assuming 40 hours / 2 hours per session
      const pricePerSession = course.getPricePerSession(2); // 2 hours per session
      
      expect(pricePerSession).toBe(course.price_per_hour * 2);
    });

    test('should handle group size pricing adjustments', () => {
      // Some courses might have different pricing based on group size
      const smallGroupPrice = course.getGroupSizePrice(3);
      const largeGroupPrice = course.getGroupSizePrice(6);
      
      // Implementation might vary - this is an example
      expect(smallGroupPrice).toBeGreaterThanOrEqual(largeGroupPrice);
    });

    test('should calculate total revenue potential', () => {
      const maxRevenue = course.getMaxRevenue();
      const expectedMaxRevenue = course.getTotalPrice() * course.max_students;
      
      expect(maxRevenue).toBe(expectedMaxRevenue);
    });
  });

  describe('Course Search and Filter Methods', () => {
    test('should filter courses by type', () => {
      const courses = [
        new Course({
          name: 'IELTS Prep',
          course_type: 'ielts_preparation',
          level: 'intermediate',
          total_hours: 60,
          price_per_hour: 300,
          max_students: 8,
          min_students: 3,
          branch_id: 1
        }),
        new Course({
          name: 'Conversation',
          course_type: 'adults_conversation',
          level: 'beginner',
          total_hours: 40,
          price_per_hour: 250,
          max_students: 6,
          min_students: 3,
          branch_id: 1
        })
      ];

      const ieltscourses = Course.filterByType(courses, 'ielts_preparation');
      expect(ieltscourses).toHaveLength(1);
      expect(ieltscourses[0].course_type).toBe('ielts_preparation');
    });

    test('should filter courses by level', () => {
      const courses = [
        new Course({
          name: 'Beginner English',
          course_type: 'adults_conversation',
          level: 'beginner',
          total_hours: 40,
          price_per_hour: 250,
          max_students: 6,
          min_students: 3,
          branch_id: 1
        }),
        new Course({
          name: 'Advanced English',
          course_type: 'adults_conversation',
          level: 'advanced',
          total_hours: 40,
          price_per_hour: 350,
          max_students: 6,
          min_students: 3,
          branch_id: 1
        })
      ];

      const beginnerCourses = Course.filterByLevel(courses, 'beginner');
      expect(beginnerCourses).toHaveLength(1);
      expect(beginnerCourses[0].level).toBe('beginner');
    });

    test('should search courses by name or description', () => {
      const course = new Course({
        name: 'IELTS Preparation Course',
        description: 'Comprehensive IELTS preparation for band 7+',
        course_type: 'ielts_preparation',
        level: 'intermediate',
        total_hours: 60,
        price_per_hour: 300,
        max_students: 8,
        min_students: 3,
        branch_id: 1
      });

      expect(course.matchesSearch('IELTS')).toBe(true);
      expect(course.matchesSearch('preparation')).toBe(true);
      expect(course.matchesSearch('band 7')).toBe(true);
      expect(course.matchesSearch('TOEIC')).toBe(false);
    });
  });
});