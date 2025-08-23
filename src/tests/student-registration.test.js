const fs = require('fs');
const path = require('path');

describe('Student Registration API Configuration', () => {
  // Test that the student route file exists and has correct content
  describe('Route Configuration', () => {
    it('should have student.js route file with correct content', () => {
      const studentRoutePath = path.join(__dirname, '../routes/student.js');
      expect(fs.existsSync(studentRoutePath)).toBe(true);
      
      const studentRouteContent = fs.readFileSync(studentRoutePath, 'utf8');
      expect(studentRouteContent).toContain("router.post('/register'");
      expect(studentRouteContent).toContain('validateStudentRegistration');
      expect(studentRouteContent).toContain('registerStudent');
    });

    it('should have updated index.js with student route', () => {
      const indexContent = fs.readFileSync(
        path.join(__dirname, '../routes/index.js'), 
        'utf8'
      );
      
      expect(indexContent).toContain("require('./student')");
      expect(indexContent).toContain("router.use('/student', studentRoute)");
    });
  });

  // Test field mappings and controller logic without requiring the controller
  describe('Controller Configuration', () => {
    it('should have registration_status field in controller', () => {
      const controllerContent = fs.readFileSync(
        path.join(__dirname, '../controllers/studentController.js'), 
        'utf8'
      );
      
      expect(controllerContent).toContain("registration_status: 'pending_exam'");
      expect(controllerContent).toContain("'students.registration_status'");
      expect(controllerContent).toContain("'users.registration_status as user_registration_status'");
    });
  });

  // Test that the registration data structure is correctly mapped
  describe('Field Mapping Validation', () => {
    it('should have correct field mappings in registerStudent', () => {
      const controllerContent = fs.readFileSync(
        path.join(__dirname, '../controllers/studentController.js'), 
        'utf8'
      );
      
      // Check key field mappings
      expect(controllerContent).toContain('first_name: firstName');
      expect(controllerContent).toContain('last_name: lastName');
      expect(controllerContent).toContain('first_name_en: firstNameEn');
      expect(controllerContent).toContain('date_of_birth: dateOfBirth');
      expect(controllerContent).toContain('branch_id: preferredBranch');
      expect(controllerContent).toContain('preferred_language: preferredLanguage');
      expect(controllerContent).toContain('language_level: languageLevel');
    });

    it('should set both users and students registration_status', () => {
      const controllerContent = fs.readFileSync(
        path.join(__dirname, '../controllers/studentController.js'), 
        'utf8'
      );
      
      // Check that users table gets registration_status
      expect(controllerContent).toContain('registration_status: \'pending_exam\'');
      
      // Check that both users and students registration_status are selected in queries
      expect(controllerContent).toContain('users.registration_status as user_registration_status');
      expect(controllerContent).toContain('students.registration_status');
    });

    it('should handle JSON fields correctly', () => {
      const controllerContent = fs.readFileSync(
        path.join(__dirname, '../controllers/studentController.js'), 
        'utf8'
      );
      
      // Check JSON field handling
      expect(controllerContent).toContain('JSON.stringify(preferredTimeSlots');
      expect(controllerContent).toContain('JSON.stringify(unavailableTimeSlots');
      expect(controllerContent).toContain('JSON.stringify(selectedCourses');
    });
  });
});