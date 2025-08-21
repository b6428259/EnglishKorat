// Test file for the new student registration API
// Run this with: node test-register-student.js

const axios = require('axios');

// Test data based on your sample request
const testStudentData = {
  firstName: "รณสิทธิ์",
  lastName: "ทวยทน",
  citizenId: "1349901174258",
  firstNameEn: "Ronnnasit",
  lastNameEn: "Tuayton", 
  dateOfBirth: "2002-09-04",
  gender: "male",
  email: "ronnasit.tuayton@gmail.com",
  phone: "0923799239",
  address: "105/350 หมู่ 6 อุบลราชธานี",
  preferredBranch: "1",
  preferredLanguage: "english",
  languageLevel: "elementary",
  selectedCourses: [99999, 30, 31],
  learningStyle: "pair",
  learningGoals: "อยากเรียนเก่งๆ",
  parentName: "",
  parentPhone: "",
  emergencyContact: "John Doe",
  emergencyPhone: "054745875",
  lineId: "33044268ss",
  nickName: "Ion",
  currentEducation: "grade5",
  recentCEFR: "A1",
  teacherType: "thai",
  preferredTimeSlots: [
    {
      id: "1755784485129_tuesday",
      day: "tuesday",
      timeFrom: "13:00",
      timeTo: "16:00"
    },
    {
      id: "1755784485129_friday", 
      day: "friday",
      timeFrom: "13:00",
      timeTo: "16:00"
    },
    {
      id: "1755784485129_thursday",
      day: "thursday",
      timeFrom: "13:00", 
      timeTo: "16:00"
    }
  ],
  unavailableTimeSlots: [
    {
      id: "1755784492323_saturday",
      day: "saturday",
      timeFrom: "00:00",
      timeTo: "23:30"
    },
    {
      id: "1755784492323_sunday",
      day: "sunday", 
      timeFrom: "00:00",
      timeTo: "23:30"
    }
  ]
};

async function testStudentRegistration() {
  try {
    console.log('Testing student registration API...');
    console.log('Data to send:', JSON.stringify(testStudentData, null, 2));
    
    const response = await axios.post('http://localhost:3000/api/v1/students/register', testStudentData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n✅ Registration successful!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('\n❌ Registration failed!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Network Error:', error.message);
    }
  }
}

// Test citizen ID validation
function testCitizenIdValidation() {
  const { validateThaiCitizenId } = require('./src/utils/citizenIdUtils');
  
  console.log('\nTesting citizen ID validation:');
  console.log('1349901174258 (test data):', validateThaiCitizenId('1349901174258'));
  console.log('1234567890123 (invalid):', validateThaiCitizenId('1234567890123'));
  console.log('1100100000001 (valid sample):', validateThaiCitizenId('1100100000001'));
}

// Run tests
console.log('=== EKLS Student Registration Test ===\n');
testCitizenIdValidation();
testStudentRegistration();
