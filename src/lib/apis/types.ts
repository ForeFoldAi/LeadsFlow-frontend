// ============================================================================
// FRONTEND TYPES - LeadConnect Backend API
// ============================================================================

// ============================================================================
// AUTH TYPES
// ============================================================================

export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  // Normal login response (when 2FA is disabled)
  accessToken?: string;
  refreshToken?: string;
  user?: UserBasic;
  // 2FA required response (when 2FA is enabled)
  requiresTwoFactor?: boolean;
  message?: string;
  email?: string;
}

// Legacy type for backward compatibility
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user?: {
    id: number;
    email: string;
    fullName: string;
    role: string;
    companyName?: string;
  };
  requires2FA?: boolean;
  requiresTwoFactor?: boolean;
}

export interface Verify2FARequest {
  email: string;
  otp: string;
}

export interface LoginWith2FAResponse {
  accessToken: string;
  refreshToken: string;
  user: UserBasic;
}

export interface SignupDto {
  fullName: string;
  email: string;
  role: UserRole;
  customRole?: string;
  companyName: string;
  companySize: CompanySize;
  industry: Industry;
  customIndustry?: string;
  website?: string;
  password: string;
  confirmPassword: string;
  phoneNumber?: string;
}

export interface SignupRequest {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  customRole?: string;
  companyName?: string;
  companySize?: string;
  industry?: Industry;
  customIndustry?: string;
  website?: string;
  phoneNumber?: string;
}

export interface SignupResponse {
  accessToken: string;
  refreshToken: string;
  user: UserBasic;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface VerifyOtpDto {
  email: string;
  otp: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface VerifyOtpResponse {
  valid: boolean;
  message: string;
}

export interface ResetPasswordDto {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface Send2FAOtpDto {
  email: string;
}

export interface Send2FAOtpRequest {
  email: string;
}

export interface Send2FAOtpResponse {
  message: string;
}

export interface Verify2FAOtpDto {
  email: string;
  otp: string;
}

export interface Verify2FAOtpResponse {
  valid: boolean;
  message: string;
  accessToken?: string;
  refreshToken?: string;
  user?: UserBasic;
  remainingAttempts?: number;
}

export interface TwoFactorStatusResponse {
  enabled: boolean;
  email: string;
}

// ============================================================================
// USER TYPES
// ============================================================================

export enum UserRole {
  SALES_REPRESENTATIVE = 'Sales Representative',
  SALES_MANAGER = 'Sales Manager',
  MANAGEMENT = 'Management',
  ADMIN = 'admin',
  SALES = 'sales',
  MARKETING = 'marketing',
  SUPPORT = 'support',
  OTHER = 'other',
}

export enum CompanySize {
  SIZE_1_10 = '1-10',
  SIZE_11_50 = '11-50',
  SIZE_51_200 = '51-200',
  SIZE_201_500 = '201-500',
  SIZE_501_1000 = '501-1000',
  SIZE_1000_PLUS = '1000+',
}

export enum Industry {
  REAL_ESTATE = 'real-estate',
  AUTOMOTIVE = 'automotive',
  TEXTILE = 'textile',
  ELECTRONICS = 'electronics',
  PHARMACEUTICALS = 'pharmaceuticals',
  FOOD_BEVERAGE = 'food-beverage',
  CONSTRUCTION = 'construction',
  FURNITURE = 'furniture',
  AGRICULTURE = 'agriculture',
  CHEMICALS = 'chemicals',
  AEROSPACE = 'aerospace',
  HEALTHCARE = 'healthcare',
  RETAIL = 'retail',
  ENERGY_OIL_GAS = 'energy-oil-gas',
  RENEWABLE_ENERGY = 'renewable-energy',
  PLASTICS = 'plastics',
  PAPER_PULP = 'paper-pulp',
  TELECOMMUNICATIONS = 'telecommunications',
  MINING = 'mining',
  MARINE = 'marine',
  JEWELRY = 'jewelry',
  PRINTING_PUBLISHING = 'printing-publishing',
  COSMETICS = 'cosmetics',
  LOGISTICS = 'logistics',
  EDUCATION = 'education',
  MANPOWER_SERVICES = 'manpower-services',
  TECHNOLOGY = 'technology',
  FINANCE = 'finance',
  CONSULTING = 'consulting',
  REAL_ESTATE_ALT = 'real_estate',
  OTHER = 'other',
}

export interface UserBasic {
  id: number;
  email: string;
  fullName: string;
  role: string;
  companyName?: string;
}

export interface UserResponse {
  id: number;
  email: string;
  fullName: string;
  role: string;
  customRole?: string;
  companyName?: string;
  companySize?: string;
  industry?: string;
  customIndustry?: string;
  website?: string;
  phoneNumber?: string;
  subscriptionStatus?: string;
  subscriptionPlan?: string;
  isActive?: boolean;
  createdAt?: Date;
}

export interface UserProfile {
  id: number;
  email: string;
  fullName: string;
  role: string;
  customRole?: string;
  companyName?: string;
  companySize?: string;
  industry?: string;
  customIndustry?: string;
  website?: string;
  phoneNumber?: string;
  subscriptionStatus?: string;
  subscriptionPlan?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  email?: string;
  role?: UserRole;
  customRole?: string;
  companyName?: string;
  companySize?: string;
  industry?: Industry;
  customIndustry?: string;
  website?: string;
  phoneNumber?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}

// ============================================================================
// PROFILE PREFERENCES TYPES
// ============================================================================

export interface NotificationSettings {
  newLeads: boolean;
  followUps: boolean;
  hotLeads: boolean;
  conversions: boolean;
  browserPush: boolean;
  dailySummary: boolean;
  emailNotifications: boolean;
  pushSubscription?: string;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  loginNotifications: boolean;
  sessionTimeout: string;
  apiKey?: string;
  lastPasswordChange?: string;
  twoFactorMethod: string;
  lastTwoFactorSetup?: string;
}

export interface UserPreferences {
  defaultView: 'table' | 'grid' | 'list';
  itemsPerPage: '10' | '20' | '30' | '40' | '50';
  autoSave: boolean;
  compactMode: boolean;
  exportFormat: 'csv' | 'xlsx' | 'pdf';
  exportNotes: boolean;
}

export interface ProfilePreferences {
  notifications: NotificationSettings;
  security: SecuritySettings;
  preferences: UserPreferences;
}

export interface UpdateNotificationSettingsDto {
  newLeads?: boolean;
  followUps?: boolean;
  hotLeads?: boolean;
  conversions?: boolean;
  browserPush?: boolean;
  dailySummary?: boolean;
  emailNotifications?: boolean;
  pushSubscription?: string;
}

export interface UpdateNotificationSettingsRequest {
  newLeads?: boolean;
  followUps?: boolean;
  hotLeads?: boolean;
  conversions?: boolean;
  browserPush?: boolean;
  dailySummary?: boolean;
  emailNotifications?: boolean;
  pushSubscription?: string;
}

export interface UpdateSecuritySettingsDto {
  twoFactorEnabled?: boolean;
  loginNotifications?: boolean;
  sessionTimeout?: '15' | '30' | '60' | '120' | '240';
}

export interface UpdateSecuritySettingsRequest {
  twoFactorEnabled?: boolean;
  loginNotifications?: boolean;
  sessionTimeout?: '15' | '30' | '60' | '120' | '240';
}

export interface UpdateUserPreferencesDto {
  defaultView?: LeadViewType;
  itemsPerPage?: '10' | '20' | '30' | '40' | '50';
  autoSave?: boolean;
  compactMode?: boolean;
  exportFormat?: 'csv' | 'xlsx' | 'pdf';
  exportNotes?: boolean;
}

export interface UpdateUserPreferencesRequest {
  defaultView?: 'table' | 'grid' | 'list';
  itemsPerPage?: '10' | '20' | '30' | '40' | '50';
  autoSave?: boolean;
  compactMode?: boolean;
  exportFormat?: 'csv' | 'xlsx' | 'pdf';
  exportNotes?: boolean;
}

export interface NotificationSettingsResponse {
  newLeads: boolean;
  followUps: boolean;
  hotLeads: boolean;
  conversions: boolean;
  browserPush: boolean;
  dailySummary: boolean;
  emailNotifications: boolean;
  pushSubscription?: string;
}

export interface SecuritySettingsResponse {
  twoFactorEnabled: boolean;
  loginNotifications: boolean;
  sessionTimeout: string;
  apiKey?: string;
  lastPasswordChange?: string;
  twoFactorMethod: string;
  lastTwoFactorSetup?: string;
}

export interface UserPreferencesResponse {
  defaultView: string;
  itemsPerPage: string;
  autoSave: boolean;
  compactMode: boolean;
  exportFormat: string;
  exportNotes: boolean;
}

export interface ProfilePreferencesResponse {
  notifications: NotificationSettingsResponse;
  security: SecuritySettingsResponse;
  preferences: UserPreferencesResponse;
}

// ============================================================================
// LEAD TYPES
// ============================================================================

export enum CustomerCategory {
  EXISTING = 'existing',
  POTENTIAL = 'potential',
}

export enum LeadStatus {
  NEW = 'new',
  FOLLOWUP = 'followup',
  QUALIFIED = 'qualified',
  HOT = 'hot',
  CONVERTED = 'converted',
  LOST = 'lost',
}

export enum LeadSource {
  WEBSITE = 'website',
  REFERRAL = 'referral',
  LINKEDIN = 'linkedin',
  FACEBOOK = 'facebook',
  TWITTER = 'twitter',
  CAMPAIGN = 'campaign',
  INSTAGRAM = 'instagram',
  GENERATED_BY = 'generated_by',
  ON_FIELD = 'on_field',
  OTHER = 'other',
}

export enum LeadViewType {
  TABLE = 'table',
  GRID = 'grid',
  LIST = 'list',
}

export interface Lead {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  dateOfBirth?: string | null;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  companyName?: string;
  designation?: string;
  customerCategory?: CustomerCategory;
  lastContactedDate?: string | null;
  lastContactedBy?: string;
  nextFollowupDate?: string | null;
  customerInterestedIn?: string;
  preferredCommunicationChannel?: string;
  customCommunicationChannel?: string;
  leadSource?: LeadSource;
  customLeadSource?: string;
  customReferralSource?: string;
  customGeneratedBy?: string;
  leadStatus?: LeadStatus;
  leadCreatedBy?: string;
  additionalNotes?: string;
  userId: number;
  user?: UserBasic;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateLeadDto {
  name: string;
  phoneNumber: string;
  email?: string;
  dateOfBirth?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  companyName?: string;
  designation?: string;
  customerCategory?: CustomerCategory;
  lastContactedDate?: string;
  lastContactedBy?: string;
  nextFollowupDate?: string;
  customerInterestedIn?: string;
  preferredCommunicationChannel?: string;
  customCommunicationChannel?: string;
  leadSource: LeadSource;
  customLeadSource?: string;
  customReferralSource?: string;
  customGeneratedBy?: string;
  leadStatus?: LeadStatus;
  leadCreatedBy?: string;
  additionalNotes?: string;
}

export interface CreateLeadRequest {
  name: string;
  phoneNumber: string;
  email?: string;
  dateOfBirth?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  companyName?: string;
  designation?: string;
  customerCategory?: CustomerCategory;
  lastContactedDate?: string;
  lastContactedBy?: string;
  nextFollowupDate?: string;
  customerInterestedIn?: string;
  preferredCommunicationChannel?: string;
  customCommunicationChannel?: string;
  leadSource?: LeadSource;
  customLeadSource?: string;
  customReferralSource?: string;
  customGeneratedBy?: string;
  leadStatus?: LeadStatus;
  leadCreatedBy?: string;
  additionalNotes?: string;
}

export interface UpdateLeadDto {
  name?: string;
  phoneNumber?: string;
  email?: string;
  dateOfBirth?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  companyName?: string;
  designation?: string;
  customerCategory?: CustomerCategory;
  lastContactedDate?: string;
  lastContactedBy?: string;
  nextFollowupDate?: string;
  customerInterestedIn?: string;
  preferredCommunicationChannel?: string;
  customCommunicationChannel?: string;
  leadSource?: LeadSource;
  customLeadSource?: string;
  customReferralSource?: string;
  customGeneratedBy?: string;
  leadStatus?: LeadStatus;
  leadCreatedBy?: string;
  additionalNotes?: string;
}

export interface UpdateLeadRequest {
  name?: string;
  phoneNumber?: string;
  email?: string;
  dateOfBirth?: string | null;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  companyName?: string;
  designation?: string;
  customerCategory?: CustomerCategory;
  lastContactedDate?: string | null;
  lastContactedBy?: string;
  nextFollowupDate?: string | null;
  customerInterestedIn?: string;
  preferredCommunicationChannel?: string;
  customCommunicationChannel?: string;
  leadSource?: LeadSource;
  customLeadSource?: string;
  customReferralSource?: string;
  customGeneratedBy?: string;
  leadStatus?: LeadStatus;
  leadCreatedBy?: string;
  additionalNotes?: string;
}

export interface LeadResponse {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  dateOfBirth?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  companyName?: string;
  designation?: string;
  customerCategory?: string;
  lastContactedDate?: string;
  lastContactedBy?: string;
  nextFollowupDate?: string;
  customerInterestedIn?: string;
  preferredCommunicationChannel?: string;
  customCommunicationChannel?: string;
  leadSource?: string;
  customLeadSource?: string;
  customReferralSource?: string;
  customGeneratedBy?: string;
  leadStatus?: string;
  leadCreatedBy?: string;
  additionalNotes?: string;
  userId: number;
  user?: UserResponse;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface GetLeadsQuery {
  search?: string;
  status?: string | string[];
  category?: string;
  city?: string;
  page?: number;
  limit?: number;
  leadStatus?: LeadStatus;
  customerCategory?: CustomerCategory;
  leadSource?: LeadSource;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedLeadsResponse {
  data: LeadResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  // Alternative format
  leads?: Lead[];
  total?: number;
  totalPages?: number;
}

export interface ImportLeadRequest {
  name: string;
  phoneNumber: string;
  email?: string;
  dateOfBirth?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  companyName?: string;
  designation?: string;
  customerCategory?: CustomerCategory;
  lastContactedDate?: string;
  lastContactedBy?: string;
  nextFollowupDate?: string;
  customerInterestedIn?: string;
  preferredCommunicationChannel?: string;
  customCommunicationChannel?: string;
  leadSource?: LeadSource;
  customLeadSource?: string;
  customReferralSource?: string;
  customGeneratedBy?: string;
  leadStatus?: LeadStatus;
  leadCreatedBy?: string;
  additionalNotes?: string;
}

export interface ImportLeadsDto {
  leads: CreateLeadDto[];
}

export interface ImportLeadsRequest {
  leads: ImportLeadRequest[];
}

export interface ImportLeadResult {
  success: boolean;
  lead?: LeadResponse | Lead;
  error?: string;
  rowNumber?: number;
  row?: number;
}

export interface ImportLeadsResponse {
  total: number;
  successful: number;
  failed: number;
  results: ImportLeadResult[];
}

// ============================================================================
// SUB-USER TYPES
// ============================================================================

export interface SubUserPermissions {
  canViewLeads: boolean;
  canEditLeads: boolean;
  canAddLeads: boolean;
}

export interface SubUser {
  id: number;
  email: string;
  fullName: string;
  role: string;
  customRole?: string;
  companyName?: string;
  companySize?: string;
  industry?: string;
  customIndustry?: string;
  website?: string;
  phoneNumber?: string;
  subscriptionStatus?: string;
  subscriptionPlan?: string;
  isActive?: boolean;
  createdAt?: string;
  permissions?: SubUserPermissions;
  parentUserId?: string | number;
}

export interface SubUserResponse extends UserResponse {
  permissions?: SubUserPermissions;
  parentUserId?: number;
}

export interface CreateSubUserDto {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  customRole?: string;
  companyName: string;
  canViewLeads?: boolean;
  canEditLeads?: boolean;
  canAddLeads?: boolean;
}

export interface CreateSubUserRequest {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  customRole?: string;
  companyName?: string;
  canViewLeads?: boolean;
  canEditLeads?: boolean;
  canAddLeads?: boolean;
}

export interface UpdateSubUserPermissionsDto {
  canViewLeads?: boolean;
  canEditLeads?: boolean;
  canAddLeads?: boolean;
}

export interface UpdateSubUserPermissionsRequest {
  canViewLeads?: boolean;
  canEditLeads?: boolean;
  canAddLeads?: boolean;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface AnalyticsQuery {
  days?: number;
  startDate?: string;
  endDate?: string;
  period?: 'day' | 'week' | 'month' | 'year';
}

export interface BasicMetrics {
  totalLeads: number;
  convertedLeads: number;
  hotLeads: number;
  potentialCustomers: number;
  newThisWeek: number;
  pendingFollowups: number;
  dueThisWeek: number;
  qualifiedLeads: number;
  readyToConvert: number;
  highPriority: number;
  convertedCustomers: number;
  lostOpportunities: number;
  conversionRate: number;
  successRate: number;
  avgConversionTime: number;
}

export interface FollowupTimeline {
  overdue: number;
  dueThisWeek: number;
  future: number;
}

export interface LeadSourceBreakdown {
  source: string;
  count: number;
  percentage: number;
}

export interface LeadStatusBreakdown {
  status: string;
  count: number;
  percentage: number;
}

export interface CategoryBreakdown {
  category: string;
  count: number;
  percentage: number;
}

export interface CommunicationChannel {
  channel: string;
  count: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: string;
  leads: number;
  converted: number;
  lost: number;
}

export interface LeadStatusCount {
  status: LeadStatus;
  count: number;
}

export interface LeadSourceCount {
  source: LeadSource;
  count: number;
}

export interface DailyLeadsCount {
  date: string;
  count: number;
}

export interface AnalyticsSummary {
  totalLeads: number;
  newLeads: number;
  followupLeads: number;
  qualifiedLeads: number;
  hotLeads: number;
  convertedLeads: number;
  lostLeads: number;
  conversionRate: number;
  leadsByStatus: LeadStatusCount[];
  leadsBySource: LeadSourceCount[];
  leadsOverTime: DailyLeadsCount[];
}

export interface AnalyticsResponse {
  basicMetrics: BasicMetrics;
  followupTimeline: FollowupTimeline;
  leadSourceBreakdown: LeadSourceBreakdown[];
  leadStatusBreakdown: LeadStatusBreakdown[];
  categoryBreakdown: CategoryBreakdown[];
  communicationChannels: CommunicationChannel[];
  next7DaysFollowups: Array<{
    id: string;
    name: string;
    email?: string;
    phoneNumber: string;
    nextFollowupDate?: string;
    leadStatus?: string;
    customerCategory?: string;
  }>;
  monthlyTrends: MonthlyTrend[];
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ApiError {
  message: string | string[];
  statusCode: number;
  error?: string;
}

// ============================================================================
// COMMON TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
}

export interface MessageResponse {
  message: string;
}

export interface TestEmailResponse {
  success: boolean;
  message: string;
  error?: string;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isLoginWith2FARequired(response: LoginResponse): response is Required<Pick<LoginResponse, 'requiresTwoFactor' | 'message' | 'email'>> {
  return response.requiresTwoFactor === true;
}

export function isNormalLoginResponse(response: LoginResponse): response is Required<Pick<LoginResponse, 'accessToken' | 'refreshToken' | 'user'>> {
  return !!response.accessToken && !!response.refreshToken && !!response.user;
}

export function isApiError(error: any): error is ApiError {
  return error && typeof error.statusCode === 'number' && typeof error.message === 'string';
}
