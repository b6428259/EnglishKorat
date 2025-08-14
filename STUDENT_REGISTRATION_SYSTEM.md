# Student Registration & Group Formation System

## Overview

This comprehensive system handles the complete student lifecycle from initial contact through group formation and class scheduling. It implements automated grouping based on CEFR levels, age groups, and schedule compatibility, with integrated LINE notifications and payment tracking.

## Key Features

### 🔄 Complete Registration Flow
1. **Pre-Test Registration** (Google Form #1 equivalent)
2. **Placement Testing** (Paper-based for kids, Online CEFR for adults)
3. **Post-Test Registration** (Google Form #2 equivalent)
4. **Automatic Group Formation** or **Individual Lesson Scheduling**

### 🤖 Intelligent Auto-Grouping
- **CEFR Level Matching**: Groups students with same level (pre A1, A1, A2, B1, B2, C1, C2)
- **Age Group Compatibility**: Kids (≤Grade 6), Students (Grade 7+), Adults (17+)
- **Schedule Overlap Detection**: Minimum 1 time slot per week compatibility
- **Size Optimization**: 2-6 people per group, 4+ auto-approved

### 📱 Automated Notifications
- **Daily Updates**: Every 3 days at 09:00
- **Status Changes**: Immediate notifications
- **Thai Format**: "น้อง[nickname] วันนี้อัปเดตกลุ่มของคุณ: ระดับ [level] [age_group] ตอนนี้มี X/Y คน..."

### 💰 Payment & Pricing
- **Group Deposit**: 3,000 THB
- **Cash/Transfer Discount**: 1,000 THB
- **Waiting Discounts**: 3,000-5,000 THB after 30+ days
- **Refund Conversion**: Deposit amount / lesson rate = lesson hours

## API Endpoints

### Public Endpoints
```http
POST /api/v1/registration/pre-test
```
Register student for placement test

### Authenticated Endpoints
```http
POST /api/v1/registration/post-test
GET  /api/v1/registration/status/:student_id
```

### Admin/Teacher Only
```http
POST /api/v1/registration/test-results
POST /api/v1/registration/trigger-grouping/:student_id
GET  /api/v1/registration/waiting-students
```

## Student Status Flow

```
finding_group → has_group_members → ready_to_open_class → 
arranging_schedule → schedule_confirmed → class_started → 
completed/cancelled
```

## Auto-Grouping Rules

1. **4+ Compatible Students**: Auto-approve group and notify for scheduling
2. **2-3 Compatible Students**: Create waiting group, continue recruiting
3. **1 Student**: Keep in waiting list, attempt grouping periodically
4. **Group Drops to 1-2**: Return members to waiting list
5. **30+ Days Waiting**: Offer discount alternatives

## Database Schema

### Enhanced Tables
- `students`: Added age_group, registration_status, deposit_amount, payment_status, availability_schedule
- `course_groups`: Added required_cefr_level, required_age_group, auto_formed, formation_type
- `student_registrations`: Added test_type, learning_option, offered_discount

### New Tables
- `group_waiting_list`: Students waiting for group formation
- `schedule_slots`: Available time slots for schedule matching
- `group_formation_history`: Audit trail of group changes
- `notification_schedules`: Automated notification management

## Usage Examples

### 1. Register New Student
```javascript
// Pre-test registration
const preTestData = {
  user_id: 123,
  first_name: "Alice",
  last_name: "Johnson", 
  age: 25,
  grade_level: "12",
  contact_source: "Facebook",
  learning_goals: "Business English"
};

const registration = await registrationService.registerForPreTest(preTestData);
// Returns: { id: 456, test_type: "online_cefr", age_group: "adults" }
```

### 2. Submit Test Results
```javascript
// After test completion
const testData = {
  registration_id: 456,
  student_id: 123,
  grammar_score: 75,
  speaking_score: 70,
  listening_score: 80,
  reading_score: 72,
  writing_score: 68,
  conducted_by: 1
};

const result = await registrationService.submitTestResults(testData);
// Returns: { cefr_level: "B1", registration_id: 456 }
```

### 3. Complete Registration
```javascript
// Post-test registration with preferences
const postTestData = {
  registration_id: 456,
  student_id: 123,
  course_id: 5,
  learning_option: "institute_arranged",
  availability_schedule: {
    monday: [{ start_time: "17:00:00", end_time: "19:00:00" }],
    wednesday: [{ start_time: "19:00:00", end_time: "21:00:00" }]
  },
  deposit_amount: 3000
};

const completion = await registrationService.completePostTestRegistration(postTestData);
// Triggers auto-grouping process
```

### 4. Check Waiting Students (Admin)
```javascript
// Get students waiting for groups
const waitingStudents = await fetch('/api/v1/registration/waiting-students?cefr_level=B1&age_group=adults');

// Returns grouped data by compatibility criteria
{
  "total_waiting": 5,
  "grouped_by_criteria": {
    "B1_adults": {
      "cefr_level": "B1",
      "age_group": "adults", 
      "count": 3,
      "students": [...]
    }
  },
  "summary": {
    "over_30_days": 1,
    "potential_groups": 1
  }
}
```

## Testing

### Run Integration Tests
```bash
node test-integration.js
```

### Run System Demo
```bash
node demo-system.js
```

### Start Development Server
```bash
npm run dev
```

## Configuration

### Environment Variables
- `NODE_ENV`: Environment (development/production)
- `LINE_CHANNEL_ACCESS_TOKEN`: LINE messaging API token
- `LINE_CHANNEL_SECRET`: LINE messaging API secret

### Notification Schedule
- Default frequency: Every 3 days
- Default time: 09:00
- Configurable per user in `notification_schedules` table

## Monitoring

### Key Metrics to Track
- Students in waiting list by CEFR level/age group
- Average waiting time before group formation
- Group formation success rate
- Notification delivery success rate
- Payment completion rate

### Admin Dashboard Queries
```sql
-- Students waiting over 30 days
SELECT * FROM students s
JOIN group_waiting_list gwl ON s.id = gwl.student_id  
WHERE gwl.days_waiting >= 30 AND gwl.active = true;

-- Group formation potential
SELECT required_cefr_level, required_age_group, COUNT(*) as student_count
FROM group_waiting_list 
WHERE active = true
GROUP BY required_cefr_level, required_age_group
HAVING COUNT(*) >= 2;
```

## Maintenance

### Daily Tasks
- Review students waiting 30+ days for discount offers
- Check notification delivery status
- Monitor group formation success rate

### Weekly Tasks  
- Analyze waiting patterns by CEFR level/age group
- Review and adjust auto-grouping thresholds
- Clean up completed notification schedules

### Monthly Tasks
- Generate comprehensive waiting student reports
- Review pricing and discount effectiveness
- Update schedule slot popularity metrics

## Support

For technical issues or feature requests, please refer to the main project documentation or contact the development team.

## Version History

- **v1.0.0**: Initial implementation with complete registration flow, auto-grouping, and notification system