# English Korat Language School API

## Phase 3: Advanced Leave Policy Management System

A comprehensive school management system API with advanced leave policy management, change tracking, and notification system.

### 🚀 New Features in Phase 3

#### 1. Dynamic Leave Policy Rules Management
- **Configurable Leave Policies**: Replace hardcoded leave credits with dynamic, configurable rules
- **Course-Specific Rules**: Different leave policies for different course types and durations
- **Effective Date Management**: Rules with start and end dates to prevent retroactive impacts
- **Multi-Branch Support**: Branch-specific policy rules

#### 2. Advanced Edit Permissions & Security
- **Role-Based Access Control**: Only authorized users (admin/owner) can modify leave policies
- **Permission Management**: Granular permissions for viewing, editing, and approving changes
- **Change Reason Requirement**: All modifications require a detailed reason
- **Validation Rules**: Prevents negative values and invalid configurations

#### 3. Comprehensive Change Tracking & Audit Trail
- **Complete History**: Track all create, update, delete, and revert operations
- **Before/After Values**: Store old and new values for every change
- **Change Summaries**: Human-readable descriptions of what changed
- **Revert Capability**: Owners can revert changes to previous states

#### 4. Real-Time Notification System
- **Instant Notifications**: Immediate alerts to owners when policies change
- **Detailed Information**: Who changed what, when, and why
- **Metadata Support**: Rich notification data with links and context
- **Read/Unread Tracking**: Mark notifications as read/unread

#### 5. Room Usage Notification System
- **Teacher Alerts**: Popup notifications for room availability and conflicts
- **Real-Time Updates**: Live notifications about room changes
- **Schedule Integration**: Notifications tied to actual class schedules
- **Conflict Prevention**: Alerts about room booking conflicts

### 📊 Database Schema

#### Core Tables Added:
- **`leave_policy_rules`**: Dynamic leave policy configurations
- **`leave_policy_permissions`**: Edit permissions management
- **`leave_policy_changes`**: Complete audit trail
- **`leave_policy_notifications`**: Policy change notifications
- **`room_notifications`**: Room usage alerts

### 🔧 API Endpoints

#### Leave Policy Management
```
POST   /api/v1/leave-policies              Create new leave policy rule
PUT    /api/v1/leave-policies/:id          Update leave policy rule (requires reason)
GET    /api/v1/leave-policies              List all leave policy rules
GET    /api/v1/leave-policies/:id          Get specific leave policy rule
```

#### Change History & Audit
```
GET    /api/v1/policy/changes              Get change history
POST   /api/v1/policy/revert/:changeId     Revert a change (owners only)
```

#### Notifications
```
GET    /api/v1/policy/notifications        Get user notifications
PUT    /api/v1/policy/notifications/:id/read    Mark notification as read
PUT    /api/v1/policy/notifications/mark-all-read    Mark all as read
```

#### Room Notifications
```
GET    /api/v1/policy/room-notifications   Get room notifications
POST   /api/v1/policy/room-notifications   Create room notification
```

### 💡 Usage Examples

#### Creating a Leave Policy Rule
```json
POST /api/v1/leave-policies
{
  "rule_name": "ระเบียบการลาคอร์ส 60 ชั่วโมง กลุ่มเล็ก",
  "course_type": "group_small",
  "course_hours": 60,
  "max_students": 5,
  "leave_credits": 2,
  "effective_date": "2024-01-01",
  "conditions": {
    "advance_notice_hours": 24,
    "makeup_classes_allowed": true
  }
}
```

#### Updating a Policy (with reason)
```json
PUT /api/v1/leave-policies/1
{
  "leave_credits": 3,
  "change_reason": "เพิ่มสิทธิ์การลาจาก 2 เป็น 3 ครั้ง ตามนโยบายใหม่ของสถาบัน"
}
```

#### Creating Room Notification
```json
POST /api/v1/policy/room-notifications
{
  "notification_type": "room_conflict",
  "title": "ห้องเรียนขัดแย้ง",
  "message": "ห้อง A1 มีการจองซ้อนกันในเวลา 14:00-16:00",
  "room_id": 1,
  "teacher_id": 5,
  "schedule_time": "2024-01-15T14:00:00Z",
  "metadata": {
    "conflicting_classes": [10, 15],
    "suggested_alternatives": [2, 3]
  }
}
```

### 🔒 Security Features

#### Permission Levels
- **Owner**: Full access to all branches, can revert changes
- **Admin**: Can edit policies in their branch, cannot revert
- **Teacher**: Read-only access to relevant policies
- **Student**: No access to policy management

#### Validation Rules
- No negative values for leave credits or prices
- Effective dates cannot be in the past
- Overlapping policies are prevented
- Change reasons are mandatory and validated

#### Concurrency Control
- Optimistic locking prevents simultaneous edits
- Version checking ensures data consistency
- Conflict detection and resolution

### 📈 Benefits

#### For Institute Owners
- **Complete Visibility**: See all policy changes with reasons
- **Quality Control**: Approve or revert any changes
- **Audit Compliance**: Complete trail of all modifications
- **Flexible Policies**: Adapt rules to business needs

#### For Administrators
- **Streamlined Management**: Easy policy updates with validation
- **Accountability**: All changes tracked with reasons
- **Real-time Updates**: Instant notifications of changes
- **Error Prevention**: Built-in validation and conflict detection

#### For Teachers
- **Transparency**: Clear understanding of leave policies
- **Real-time Alerts**: Room conflict notifications
- **Improved Planning**: Better schedule management

#### For Students
- **Consistent Experience**: Standardized leave policies
- **Fair Treatment**: Transparent and auditable rules
- **Better Service**: Reduced conflicts and confusion

### 🚀 Getting Started

1. **Run Migrations**
   ```bash
   npm run migrate
   ```

2. **Seed Initial Data** (optional)
   ```bash
   npm run seed
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Access API Documentation**
   - Visit `http://localhost:3000/api/v1` for endpoint listing
   - Download Postman collection from `http://localhost:3000/api/v1/postman-collection.json`

### 📝 Migration Notes

#### Backward Compatibility
- Existing enrollments continue to work with legacy leave credits
- New enrollments automatically use applicable policy rules
- Gradual migration path from hardcoded to dynamic rules

#### Data Migration Strategy
1. **Phase 1**: Install new schema alongside existing system
2. **Phase 2**: Create default policy rules matching current logic
3. **Phase 3**: Migrate existing enrollments to use policy rules
4. **Phase 4**: Remove legacy hardcoded logic

### 🔧 Configuration

#### Environment Variables
```env
# Database settings remain the same
DB_CLIENT=mysql2
DB_HOST=127.0.0.1
DB_PORT=3307
# ... other existing variables

# Optional: Notification settings
NOTIFICATION_EMAIL_ENABLED=true
NOTIFICATION_LINE_ENABLED=true
```

### 🧪 Testing

#### Run All Tests
```bash
npm test
```

#### Run Specific Test Suites
```bash
npm test -- --testPathPattern=phase3
```

#### Test Coverage
- Unit tests for all new controllers
- Integration tests for policy workflows
- Validation tests for security features
- Performance tests for notification system

### 📊 Monitoring & Analytics

#### Key Metrics Tracked
- Policy change frequency by branch/user
- Notification delivery rates
- Room conflict resolution times
- Leave policy utilization rates

#### Audit Reports Available
- Monthly policy change summaries
- User activity reports
- Branch policy compliance reports
- System usage analytics

---

### 📞 Support

For questions or issues with the leave policy management system:
- Review API documentation at `/api/v1`
- Check audit logs in the admin interface
- Contact system administrators for policy questions

### 🔄 Version History

- **v1.0.0**: Initial release with basic attendance and enrollment
- **v2.0.0**: Enhanced course and schedule management
- **v3.0.0**: Advanced leave policy management system (current)

### 📄 License

This project is proprietary software for English Korat Language School.