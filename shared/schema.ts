import { sql } from "drizzle-orm";
import { pgTable, text, varchar, date, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Custom URL validation function that accepts various formats
const flexibleUrlSchema = z.string().refine((value) => {
  if (!value || value === "") return true; // Allow empty strings
  
  // Remove leading/trailing whitespace
  const trimmedValue = value.trim();
  
  // Basic URL patterns
  const urlPatterns = [
    // Full URLs with protocol
    /^https?:\/\/[^\s/$.?#].[^\s]*$/i,
    // URLs without protocol but with www
    /^www\.[^\s/$.?#].[^\s]*$/i,
    // URLs without protocol and www
    /^[^\s/$.?#][^\s]*\.[a-z]{2,}$/i,
    // URLs with subdomains
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i,
    // IP addresses
    /^https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?(\/.*)?$/i,
  ];
  
  return urlPatterns.some(pattern => pattern.test(trimmedValue));
}, {
  message: "Please enter a valid website URL (e.g., example.com, www.example.com, https://example.com)"
});

export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // User who owns this lead
  name: text("name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  email: text("email"),
  dateOfBirth: date("date_of_birth"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  pincode: text("pincode"),
  companyName: text("company_name"),
  designation: text("designation"),
  customerCategory: text("customer_category").notNull(), // "existing" | "potential"
  lastContactedDate: date("last_contacted_date"),
  lastContactedBy: text("last_contacted_by"),
  nextFollowupDate: date("next_followup_date"),
  customerInterestedIn: text("customer_interested_in"),
  preferredCommunicationChannel: text("preferred_communication_channel"), // "email" | "phone" | "whatsapp" | "sms" | "in-person" | "linkedin" | "other"
  customCommunicationChannel: text("custom_communication_channel"), // Used when preferredCommunicationChannel is "other"
  leadSource: text("lead_source").notNull(), // "website" | "referral" | "linkedin" | "facebook" | "twitter" | "campaign" | "instagram" | "generated_by" | "on_field" | "other"
  customLeadSource: text("custom_lead_source"), // Used when leadSource is "other"
  customReferralSource: text("custom_referral_source"), // Used when leadSource is "referral"
  customGeneratedBy: text("custom_generated_by"), // Used when leadSource is "generated_by"
  leadStatus: text("lead_status").notNull(), // "new" | "followup" | "qualified" | "hot" | "converted" | "lost"
  leadCreatedBy: text("lead_created_by"), // New field for who created the lead
  additionalNotes: text("additional_notes"),
  sector: text("sector"), // "technology" | "healthcare" | "finance" | "education" | "retail" | "manufacturing" | "real_estate" | "consulting" | "hospitality" | "transportation" | "energy" | "media" | "other"
  customSector: text("custom_sector"), // Used when sector is "other"
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Name validation - only letters, spaces, and dots
const leadNameSchema = z.string()
  .min(1, "Name is required")
  .min(2, "Name must be at least 2 characters")
  .max(50, "Name must be less than 50 characters")
  .regex(/^[a-zA-Z\s.]+$/, "Name can only contain letters, spaces, and dots")
  .refine((value) => {
    // Check if name contains at least one letter
    return /[a-zA-Z]/.test(value);
  }, {
    message: "Name must contain at least one letter"
  });

// Phone number validation - allow up to 15 digits and any formatting characters
const leadPhoneSchema = z.string()
  .min(1, "Phone number is required")
  .refine((value) => {
    const digitCount = (value.match(/\d/g) ?? []).length;
    return digitCount > 0 && digitCount <= 15;
  }, {
    message: "Phone number can include formatting characters but must contain up to 15 digits",
  });

// Company name validation - allow any characters up to 100 length
const leadCompanyNameSchema = z.string()
  .max(100, "Company name must be less than 100 characters")
  .optional()
  .or(z.literal(""));

// Pincode validation - 6 digits for Indian pincodes
const pincodeSchema = z.string()
  .regex(/^\d{6}$/, "Pincode must be exactly 6 digits")
  .optional()
  .or(z.literal(""));

// Date validation - must be a valid date and not in the future
const dateSchema = z.string()
  .refine((value) => {
    if (!value || value.trim() === "") return true; // Allow empty
    const date = new Date(value);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    return !isNaN(date.getTime()) && date <= today;
  }, {
    message: "Date cannot be in the future"
  })
  .optional()
  .or(z.literal(""))
  .or(z.null());

// Future date validation - must be a valid date and in the future
const futureDateSchema = z.string()
  .refine((value) => {
    if (!value || value.trim() === "") return true; // Allow empty
    const date = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    return !isNaN(date.getTime()) && date >= today;
  }, {
    message: "Follow-up date must be today or in the future"
  })
  .optional()
  .or(z.literal(""))
  .or(z.null());

export const insertLeadSchema = createInsertSchema(leads, {
  userId: z.string().optional(), // Will be set automatically based on authenticated user
  name: leadNameSchema,
  phoneNumber: leadPhoneSchema,
  email: z.string()
    .email("Invalid email address")
    .max(254, "Email must be less than 254 characters")
    .toLowerCase()
    .optional()
    .or(z.literal("")),
  dateOfBirth: dateSchema,
  city: z.string()
    .max(50, "City must be less than 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "City can only contain letters and spaces")
    .optional()
    .or(z.literal("")),
  state: z.string()
    .max(50, "State must be less than 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "State can only contain letters and spaces")
    .optional()
    .or(z.literal("")),
  country: z.string()
    .max(50, "Country must be less than 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "Country can only contain letters and spaces")
    .optional()
    .or(z.literal("")),
  pincode: pincodeSchema,
  companyName: leadCompanyNameSchema,
  designation: z.string()
    .max(50, "Designation must be less than 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "Designation can only contain letters and spaces")
    .optional()
    .or(z.literal("")),
  customerCategory: z.enum(["existing", "potential"], { required_error: "Customer category is required" }),
  lastContactedDate: dateSchema,
  lastContactedBy: z.string()
    .max(50, "Maximum 50 characters allowed")
    .regex(/^[a-zA-Z\s]+$/, "Can only contain letters and spaces")
    .optional()
    .or(z.literal("")),
  nextFollowupDate: futureDateSchema,
  customerInterestedIn: z.string()
    .max(100, "Maximum 100 characters allowed")
    .optional()
    .or(z.literal("")),
  preferredCommunicationChannel: z.enum(["email", "phone", "whatsapp", "sms", "in-person", "linkedin", "other"]).optional(),
  customCommunicationChannel: z.string()
    .max(50, "Maximum 50 characters allowed")
    .regex(/^[a-zA-Z\s]+$/, "Can only contain letters and spaces")
    .optional()
    .or(z.literal("")),
  leadSource: z.enum(["website", "referral", "linkedin", "facebook", "twitter", "campaign", "instagram", "generated_by", "on_field", "other"], { required_error: "Lead source is required" }),
  customLeadSource: z.string()
    .max(50, "Maximum 50 characters allowed")
    .regex(/^[a-zA-Z\s]+$/, "Can only contain letters and spaces")
    .optional()
    .or(z.literal("")),
  customReferralSource: z.string()
    .max(50, "Maximum 50 characters allowed")
    .regex(/^[a-zA-Z\s]+$/, "Can only contain letters and spaces")
    .optional()
    .or(z.literal("")),
  customGeneratedBy: z.string()
    .max(50, "Maximum 50 characters allowed")
    .regex(/^[a-zA-Z\s]+$/, "Can only contain letters and spaces")
    .optional()
    .or(z.literal("")),
  leadStatus: z.enum(["new", "followup", "qualified", "hot", "converted", "lost"], { required_error: "Lead status is required" }),
  leadCreatedBy: z.string()
    .max(50, "Maximum 50 characters allowed")
    .regex(/^[a-zA-Z\s]+$/, "Can only contain letters and spaces")
    .optional()
    .or(z.literal("")),
  additionalNotes: z.string()
    .max(200, "Maximum 200 characters allowed")
    .optional()
    .or(z.literal("")),
  sector: z.string().min(1, "Sector is required"),
  customSector: z.string()
    .max(255, "Maximum 255 characters allowed")
    .optional()
    .or(z.literal("")),
}).omit({ id: true, createdAt: true });

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

// Users table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("user"), // "admin" | "user" | "manager" | "other"
  customRole: text("custom_role"), // Used when role is "other"
  companyName: text("company_name").notNull(),
  companySize: text("company_size").notNull(),
  industry: text("industry").notNull(),
  website: text("website"),
  phoneNumber: text("phone_number"),
  subscriptionStatus: text("subscription_status").notNull().default("trial"), // "trial" | "active" | "cancelled" | "expired"
  subscriptionPlan: text("subscription_plan").notNull().default("basic"), // "basic" | "professional" | "enterprise"
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["admin", "user", "manager", "other"]).default("user"),
  customRole: z.string().max(50, "Maximum 50 characters allowed").optional(),
  companyName: z.string()
    .min(1, "Company name is required")
    .max(100, "Company name must be less than 100 characters"),
  companySize: z.enum(["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"], { required_error: "Company size is required" }),
  industry: z.string().min(1, "Industry is required"),
  website: flexibleUrlSchema.optional().or(z.literal("")),
  phoneNumber: z.string()
    .refine((value) => {
      if (!value || value.trim() === "") return true;
      const digitCount = (value.match(/\d/g) ?? []).length;
      return digitCount > 0 && digitCount <= 15;
    }, {
      message: "Phone number can include formatting characters but must contain up to 15 digits",
    })
    .optional()
    .or(z.literal("")),
  subscriptionStatus: z.enum(["trial", "active", "cancelled", "expired"]).default("trial"),
  subscriptionPlan: z.enum(["basic", "professional", "enterprise"]).default("basic"),
}).omit({ id: true, createdAt: true, updatedAt: true, isActive: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// User Preferences table
export const userPreferences = pgTable("user_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  defaultView: text("default_view").notNull().default("table"), // "table" | "grid" | "list"
  itemsPerPage: text("items_per_page").notNull().default("20"), // "10" | "20" | "50" | "100"
  autoSave: boolean("auto_save").notNull().default(true),
  compactMode: boolean("compact_mode").notNull().default(false),
  exportFormat: text("export_format").notNull().default("csv"), // "csv" | "xlsx" | "pdf"
  exportNotes: boolean("export_notes").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences, {
  userId: z.string().min(1, "User ID is required"),
  defaultView: z.enum(["table", "grid", "list"]).default("table"),
  itemsPerPage: z.enum(["10", "20", "50", "100"]).default("20"),
  autoSave: z.boolean().default(true),
  compactMode: z.boolean().default(false),
  exportFormat: z.enum(["csv", "xlsx", "pdf"]).default("csv"),
  exportNotes: z.boolean().default(true),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;

// Notification Settings table
export const notificationSettings = pgTable("notification_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  newLeads: boolean("new_leads").notNull().default(true),
  followUps: boolean("follow_ups").notNull().default(true),
  hotLeads: boolean("hot_leads").notNull().default(true),
  conversions: boolean("conversions").notNull().default(true),
  browserPush: boolean("browser_push").notNull().default(false),
  dailySummary: boolean("daily_summary").notNull().default(false),
  emailNotifications: boolean("email_notifications").notNull().default(true),
  pushSubscription: jsonb("push_subscription"), // Store push notification subscription data
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertNotificationSettingsSchema = createInsertSchema(notificationSettings, {
  userId: z.string().min(1, "User ID is required"),
  newLeads: z.boolean().default(true),
  followUps: z.boolean().default(true),
  hotLeads: z.boolean().default(true),
  conversions: z.boolean().default(true),
  browserPush: z.boolean().default(false),
  dailySummary: z.boolean().default(false),
  emailNotifications: z.boolean().default(true),
  pushSubscription: z.any().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertNotificationSettings = z.infer<typeof insertNotificationSettingsSchema>;
export type NotificationSettings = typeof notificationSettings.$inferSelect;

// Security Settings table
export const securitySettings = pgTable("security_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorMethod: text("two_factor_method").notNull().default("email"), // "email" | "sms" | "authenticator"
  twoFactorSecret: text("two_factor_secret"), // For authenticator apps (future use)
  twoFactorBackupCodes: jsonb("two_factor_backup_codes"), // Backup codes for account recovery
  loginNotifications: boolean("login_notifications").notNull().default(true),
  sessionTimeout: text("session_timeout").notNull().default("30"), // minutes
  apiKey: text("api_key").notNull(),
  lastPasswordChange: timestamp("last_password_change"),
  lastTwoFactorSetup: timestamp("last_two_factor_setup"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertSecuritySettingsSchema = createInsertSchema(securitySettings, {
  userId: z.string().min(1, "User ID is required"),
  twoFactorEnabled: z.boolean().default(false),
  loginNotifications: z.boolean().default(true),
  sessionTimeout: z.enum(["15", "30", "60", "120", "240"]).default("30"),
  apiKey: z.string().min(1, "API key is required"),
  lastPasswordChange: z.string().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertSecuritySettings = z.infer<typeof insertSecuritySettingsSchema>;
export type SecuritySettings = typeof securitySettings.$inferSelect;

// Notification Logs table
export const notificationLogs = pgTable("notification_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "new_lead" | "lead_update" | "lead_converted" | "followup" | "system"
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  metadata: jsonb("metadata"), // Store additional data like lead ID, changes, etc.
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertNotificationLogSchema = createInsertSchema(notificationLogs, {
  userId: z.string().min(1, "User ID is required"),
  type: z.enum(["new_lead", "lead_update", "lead_converted", "followup", "system"]),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  read: z.boolean().default(false),
  metadata: z.any().optional(),
}).omit({ id: true, createdAt: true });

export type InsertNotificationLog = z.infer<typeof insertNotificationLogSchema>;
export type NotificationLog = typeof notificationLogs.$inferSelect;

// User Sessions table (for session management)
export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionToken: text("session_token").notNull().unique(),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertUserSessionSchema = createInsertSchema(userSessions, {
  userId: z.string().min(1, "User ID is required"),
  sessionToken: z.string().min(1, "Session token is required"),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  expiresAt: z.string().min(1, "Expiration date is required"),
}).omit({ id: true, createdAt: true });

export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type UserSession = typeof userSessions.$inferSelect;

// Password Reset table for OTP-based password reset
export const passwordResets = pgTable("password_resets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  otp: text("otp").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertPasswordResetSchema = createInsertSchema(passwordResets, {
  userId: z.string().min(1, "User ID is required"),
  email: z.string().email("Invalid email address"),
  otp: z.string().min(6, "OTP must be at least 6 characters").max(6, "OTP must be exactly 6 characters"),
  expiresAt: z.string().min(1, "Expiration date is required"),
  used: z.boolean().default(false),
}).omit({ id: true, createdAt: true });

export type InsertPasswordReset = z.infer<typeof insertPasswordResetSchema>;
export type PasswordReset = typeof passwordResets.$inferSelect;
