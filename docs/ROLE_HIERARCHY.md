# Role Hierarchy System

## Overview
StatPedia uses a hierarchical role system where higher roles inherit all privileges from lower roles, plus additional privileges specific to their level.

## Role Hierarchy (Highest to Lowest)

### 1. OWNER 🏆
**Highest level role with complete system control**

**Privileges:**
- ✅ **All Admin privileges** (inherited)
- ✅ **Manage other Owners** - Can promote/demote other owners
- ✅ **Access Owner Panel** - Special owner-only interface
- ✅ **Manage Billing** - Handle subscription and payment systems
- ✅ **Delete Everything** - Nuclear option to delete any content
- ✅ **System Override** - Can override any system restrictions

**Who has it:**
- `lifesplugg@gmail.com` (plug user) - **OWNER**

### 2. ADMIN 👨‍💼
**Administrative role with comprehensive management privileges**

**Privileges:**
- ✅ **All Moderator privileges** (inherited)
- ✅ **Manage Users** - Create, edit, delete user accounts
- ✅ **Promote/Demote Users** - Change user roles (except owners)
- ✅ **Access Admin Panel** - Administrative interface
- ✅ **Manage System Settings** - Configure system-wide settings
- ✅ **View Analytics** - Access detailed system analytics
- ✅ **Manage Database** - Direct database access and management
- ✅ **Delete Content** - Remove any user-generated content

**Who has it:**
- Currently no admins assigned

### 3. MODERATOR 🛡️
**Content moderation role**

**Privileges:**
- ✅ **Moderate Content** - Review and moderate user posts/comments
- ✅ **Manage Content** - Edit/approve user-generated content
- ❌ **Cannot delete users or content**
- ❌ **Cannot access admin functions**
- ❌ **Cannot promote/demote users**

**Who has it:**
- Currently no moderators assigned

### 4. USER 👤
**Basic user role (default)**

**Privileges:**
- ✅ **Create Content** - Post predictions, comments
- ✅ **View Content** - Access all public content
- ✅ **Manage Own Profile** - Edit personal information
- ❌ **Cannot moderate content**
- ❌ **Cannot manage other users**
- ❌ **Cannot access admin functions**

**Who has it:**
- All new users (default role)

## Role Management Rules

### Promotion/Demotion Rules
- **Owners** can manage everyone (including other owners)
- **Admins** can manage moderators and users
- **Moderators** cannot manage user roles
- **Users** cannot manage any roles

### Role Inheritance
Each role inherits all privileges from lower roles:

```
OWNER = All privileges
ADMIN = Moderator + User privileges + Admin-specific privileges  
MODERATOR = User privileges + Moderator-specific privileges
USER = Basic user privileges only
```

## Current Role Assignments

| User | Email | Role | Assigned |
|------|-------|------|----------|
| plug | lifesplugg@gmail.com | **OWNER** | ✅ Active |

## Role Display in UI

### Badge Colors
- **OWNER**: Red badge with gradient background
- **ADMIN**: Green badge
- **MODERATOR**: Blue badge  
- **USER**: No badge (default)

### Role Names
- **OWNER**: "Owner"
- **ADMIN**: "Administrator"
- **MODERATOR**: "Moderator"
- **USER**: No display (default)

## Technical Implementation

### Database
- Roles stored in `user_roles` table
- Foreign key relationship to `auth_user` table
- Check constraint ensures valid role values

### API Endpoints
- `GET /api/auth/user-role/:userId` - Get user role
- `POST /api/auth/assign-role` - Assign role (admin+ only)
- `GET /api/auth/role-permissions/:role` - Get role permissions

### Frontend Integration
- AuthContext fetches and stores user role
- Navigation component displays role badge
- Role-based UI components and access control

## Security Considerations

1. **Role Escalation Prevention**: Users cannot self-promote
2. **Audit Trail**: All role changes are logged
3. **Permission Validation**: Server-side validation for all role-based actions
4. **Default Role**: New users default to 'user' role
5. **Role Hierarchy Enforcement**: Lower roles cannot manage higher roles

## Future Enhancements

- [ ] Role expiration dates
- [ ] Temporary role assignments
- [ ] Role-based feature flags
- [ ] Advanced permission granularity
- [ ] Role audit logs
