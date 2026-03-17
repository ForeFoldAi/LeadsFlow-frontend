// Export all services
export { default as axiosInstance } from './axios.config';
export {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  clearTokens,
} from './axios.config';

export { default as authService } from './auth.service';
export { default as leadsService } from './leads.service';
export { default as usersService } from './users.service';
export { default as analyticsService } from './analytics.service';
export { default as profileService } from './profile.service';
export { default as notificationsService } from './notifications.service';
export { default as automationService } from './automation.service';
export { default as templatesService } from './templates.service';
export { default as communicationService } from './communication.service';
export { default as leadGeneratorService } from './lead-generator.service';
export type {
  GenerateLeadsRequest,
  GenerateResponse,
  LeadResult,
  ScrapeRequest,
  JobRead,
  LeadRead,
  LeadListResponse,
} from './lead-generator.service';

// Export all types
export * from './types';

// Re-export commonly used types for convenience
export type {
  LoginDto,
  SignupDto,
  AuthResponse,
  UserResponse,
  CreateLeadDto,
  UpdateLeadDto,
  LeadResponse,
  GetLeadsQuery,
  PaginatedLeadsResponse,
  AnalyticsResponse,
  AnalyticsQuery,
  BasicMetrics,
  FollowupTimeline,
  ProfilePreferencesResponse,
  NotificationSettingsResponse,
  SecuritySettingsResponse,
  UserPreferencesResponse,
  UpdateNotificationSettingsDto,
  UpdateSecuritySettingsDto,
  UpdateUserPreferencesDto,
  CreateSubUserDto,
  SubUserResponse,
  UpdateSubUserPermissionsDto,
  SubUserPermissions,
} from './types';

export {
  UserRole,
  CompanySize,
  Industry,
  CustomerCategory,
  LeadStatus,
  LeadSource,
  LeadViewType,
} from './types';


