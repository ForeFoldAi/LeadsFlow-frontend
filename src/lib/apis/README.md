# Frontend API Integration

This directory contains all the necessary files for integrating with the LeadConnect backend API.

## Files Structure

```
apis/
├── axios.config.ts      # Axios instance with interceptors and token management
├── types.ts             # TypeScript types and interfaces
├── auth.service.ts      # Authentication API functions
├── leads.service.ts     # Leads CRUD API functions
├── users.service.ts     # Users API functions
├── analytics.service.ts # Analytics API functions
├── profile.service.ts   # Profile settings and sub-user management API functions
├── index.ts            # Main export file
└── README.md           # This file
```

## Installation

1. Copy all files from `apis/` to your frontend project
2. Install required dependencies:

```bash
npm install axios
# or
yarn add axios
```

## Setup

### Environment Variables

Add to your `.env` or `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
# or for React
REACT_APP_API_URL=http://localhost:3000/api
```

### Usage Example

#### React/Next.js

```typescript
import { authService, leadsService, analyticsService, profileService } from './apis';

// Login
const handleLogin = async () => {
  try {
    const response = await authService.login({
      email: 'user@example.com',
      password: 'password123',
    });
    console.log('Logged in:', response.user);
  } catch (error) {
    console.error('Login failed:', error);
  }
};

// Get leads
const fetchLeads = async () => {
  try {
    const response = await leadsService.getAllLeads({
      page: 1,
      limit: 10,
      status: 'new',
    });
    console.log('Leads:', response.data);
  } catch (error) {
    console.error('Failed to fetch leads:', error);
  }
};

// Get analytics
const fetchAnalytics = async () => {
  try {
    const analytics = await analyticsService.getAnalytics({ days: 7 });
    console.log('Analytics:', analytics);
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
  }
};

// Profile Settings
const fetchProfileSettings = async () => {
  try {
    const preferences = await profileService.getProfilePreferences();
    console.log('Profile Settings:', preferences);
  } catch (error) {
    console.error('Failed to fetch profile settings:', error);
  }
};

const updateNotifications = async () => {
  try {
    const updated = await profileService.updateNotificationSettings({
      newLeads: true,
      followUps: true,
      dailySummary: false,
    });
    console.log('Updated notifications:', updated);
  } catch (error) {
    console.error('Failed to update notifications:', error);
  }
};

// Sub-Users Management (Management role only)
const fetchSubUsers = async () => {
  try {
    const subUsers = await profileService.getAllSubUsers();
    console.log('Sub-users:', subUsers);
  } catch (error) {
    console.error('Failed to fetch sub-users:', error);
  }
};

const createSubUser = async () => {
  try {
    const newUser = await profileService.createSubUser({
      fullName: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      role: UserRole.SALES_REPRESENTATIVE,
      companyName: 'Acme Corp',
      canViewLeads: true,
      canEditLeads: false,
      canAddLeads: true,
    });
    console.log('Created sub-user:', newUser);
  } catch (error) {
    console.error('Failed to create sub-user:', error);
  }
};
```

## Features

### ✅ Automatic Token Management
- Tokens are automatically stored in localStorage
- Access token is automatically added to all requests
- Automatic token refresh on 401 errors

### ✅ TypeScript Support
- Full type definitions for all API requests and responses
- Enum types for dropdowns and selections

### ✅ Error Handling
- Automatic handling of authentication errors
- Token refresh on expiration
- Redirect to login on refresh failure

### ✅ Services Available

#### Auth Service
- `signup()` - User registration
- `login()` - User login
- `logout()` - User logout
- `forgotPassword()` - Request password reset OTP
- `verifyOtp()` - Verify password reset OTP
- `resetPassword()` - Reset password with OTP
- `refreshToken()` - Refresh access token
- `isAuthenticated()` - Check if user is authenticated

#### Leads Service
- `getAllLeads()` - Get paginated leads with filters
- `getLeadById()` - Get single lead
- `createLead()` - Create new lead
- `updateLead()` - Update lead
- `deleteLead()` - Delete lead
- `importLeads()` - Bulk import leads
- `exportLeads()` - Export leads as CSV blob
- `downloadCsv()` - Download CSV file

#### Users Service
- `getAllUsers()` - Get all users
- `getUserById()` - Get user by ID

#### Analytics Service
- `getAnalytics()` - Get analytics data
- `getAnalyticsLast7Days()` - Get last 7 days analytics
- `getAnalyticsLast30Days()` - Get last 30 days analytics
- `getAnalyticsLast90Days()` - Get last 90 days analytics

#### Profile Service
- `getProfilePreferences()` - Get all profile preferences (notifications, security, app)
- `updateNotificationSettings()` - Update notification settings
- `updateSecuritySettings()` - Update security settings
- `updateUserPreferences()` - Update application preferences
- `getAllSubUsers()` - Get all sub-users (Management role only)
- `createSubUser()` - Create a new sub-user (Management role only)
- `updateSubUserPermissions()` - Update sub-user permissions (Management role only)
- `deleteSubUser()` - Delete a sub-user (Management role only)

## Types and Enums

All TypeScript types are exported from `types.ts`:

```typescript
import {
  UserRole,
  CompanySize,
  Industry,
  CustomerCategory,
  LeadStatus,
  LeadSource,
  LeadViewType,
  LeadResponse,
  CreateLeadDto,
  AnalyticsResponse,
  ProfilePreferencesResponse,
  NotificationSettingsResponse,
  SecuritySettingsResponse,
  UserPreferencesResponse,
  SubUserResponse,
  CreateSubUserDto,
} from './apis';
```

## API Endpoints

All endpoints are automatically prefixed with `/api`:
- `/api/auth/*` - Authentication endpoints
- `/api/leads/*` - Leads endpoints
- `/api/users/*` - Users endpoints
- `/api/analytics` - Analytics endpoint
- `/api/profile/*` - Profile settings and sub-user management endpoints

## Notes

- All authentication endpoints are public (no token required)
- All other endpoints require Bearer token authentication
- Tokens are stored in localStorage
- Token refresh is handled automatically
- All dates should be in ISO format (YYYY-MM-DD)

