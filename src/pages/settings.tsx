import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings as SettingsIcon, User, Bell, Shield, Mail, Phone, Save, Eye, EyeOff, Smartphone, Key, Users, Plus, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { requestFirebaseToken, isFirebaseMessagingConfigured } from "@/lib/firebase";
import { ButtonLoader, InlineLoader } from "@/components/ui/loader";
import { profileService } from "@/lib/apis";
import { useLocation } from "wouter";
import type { 
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
  UserResponse
} from "@/lib/apis";
import { UserRole, CompanySize, Industry, LeadViewType } from "@/lib/apis";
import { queryClient } from "@/lib/queryClient";

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

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: z.nativeEnum(UserRole, { required_error: "Please select a role" }),
  customRole: z.string().optional(),
  companyName: z.string().min(1, "Company name is required"),
  companySize: z.nativeEnum(CompanySize, { required_error: "Company size is required" }),
  industry: z.nativeEnum(Industry, { required_error: "Industry is required" }),
  customIndustry: z.string().optional(),
  website: flexibleUrlSchema.optional().or(z.literal("")),
  phoneNumber: z.string().regex(/^\+?[\d\s\-\(\)]+$/, "Invalid phone number format").optional().or(z.literal("")),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => {
  if (data.role === UserRole.OTHER && (!data.customRole || data.customRole.trim() === "")) {
    return false;
  }
  return true;
}, {
  message: "Please specify your role",
  path: ["customRole"],
}).refine((data) => {
  if (data.industry === Industry.OTHER && (!data.customIndustry || data.customIndustry.trim() === "")) {
    return false;
  }
  return true;
}, {
  message: "Please specify your industry",
  path: ["customIndustry"],
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function Settings() {
  const [, setLocation] = useLocation();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("user");
  const [apiKey, setApiKey] = useState(() => {
    const saved = localStorage.getItem('userApiKey');
    if (saved) return saved;

    const newKey = `lf_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('userApiKey', newKey);
    return newKey;
  });
  const { toast } = useToast();

  // Handler for auto-logout on authentication failure
  const handleAutoLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    toast({
      title: "Session Expired",
      description: "Your session has expired. Please login again.",
      variant: "destructive",
    });
    setLocation('/login');
  };

  // Check if error is authentication error and handle it
  const handleApiError = (error: any) => {
    const isAuthError = error?.response?.status === 401 || error?.response?.status === 403;
    
    if (isAuthError) {
      handleAutoLogout();
      return true; // Indicates auth error was handled
    }
    
    return false; // Not an auth error
  };

  // Settings state management
  const [is2FAOperationInProgress, setIs2FAOperationInProgress] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<{
    newLeads: boolean;
    followUps: boolean;
    hotLeads: boolean;
    conversions: boolean;
    browserPush: boolean;
    dailySummary: boolean;
    emailNotifications: boolean;
    pushSubscription?: any;
  }>({
    // Default values - ALL OFF by default for privacy
    // These will be overridden by server data when loaded
    newLeads: false,
    followUps: false,
    hotLeads: false,
    conversions: false,
    browserPush: false,
    dailySummary: false,
    emailNotifications: false,
    pushSubscription: null,
  });

  const [securitySettings, setSecuritySettings] = useState<{
    twoFactorEnabled: boolean;
    loginNotifications: boolean;
    sessionTimeout: string;
    apiKey: string;
  }>({
    twoFactorEnabled: false,
    loginNotifications: false,
    sessionTimeout: '30',
    apiKey: ''
  });

  const [preferenceSettings, setPreferenceSettings] = useState<{
    defaultView: string;
    itemsPerPage: string;
    autoSave: boolean;
    compactMode: boolean;
    exportFormat: string;
    exportNotes: boolean;
  }>({
    defaultView: 'table',
    itemsPerPage: '20',
    autoSave: true,
    compactMode: false,
    exportFormat: 'csv',
    exportNotes: true
  });

  const isPushConfigAvailable = isFirebaseMessagingConfigured();
  const isBrowserPushSupported = typeof window !== 'undefined' && 'Notification' in window && typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  const canEnableBrowserPush = isPushConfigAvailable && isBrowserPushSupported;

  type SaveNotificationPayload = {
    settings: Record<string, any>;
    pushToken?: string | null;
    unsubscribePush?: boolean;
  };



  // Get current user data
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isSubUser = currentUser.role !== UserRole.MANAGEMENT;
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Load settings from API
  React.useEffect(() => {
    const loadSettings = async () => {
      setIsLoadingSettings(true);
      try {
        const preferences = await profileService.getProfilePreferences();
        setNotificationSettings({
          newLeads: preferences.notifications.newLeads,
          followUps: preferences.notifications.followUps,
          hotLeads: preferences.notifications.hotLeads,
          conversions: preferences.notifications.conversions,
          browserPush: preferences.notifications.browserPush,
          dailySummary: preferences.notifications.dailySummary,
          emailNotifications: preferences.notifications.emailNotifications,
          pushSubscription: preferences.notifications.pushSubscription,
        });
        setSecuritySettings({
          twoFactorEnabled: preferences.security.twoFactorEnabled,
          loginNotifications: preferences.security.loginNotifications,
          sessionTimeout: preferences.security.sessionTimeout,
          apiKey: preferences.security.apiKey || apiKey,
        });
        if (preferences.security.apiKey) {
          setApiKey(preferences.security.apiKey);
        }
        setPreferenceSettings({
          defaultView: preferences.preferences.defaultView,
          itemsPerPage: preferences.preferences.itemsPerPage,
          autoSave: preferences.preferences.autoSave,
          compactMode: preferences.preferences.compactMode,
          exportFormat: preferences.preferences.exportFormat,
          exportNotes: preferences.preferences.exportNotes,
        });
      } catch (error: any) {
        console.error("Error loading settings:", error);
        
        // Check if it's an authentication error (401 or 403)
        const isAuthError = error?.response?.status === 401 || error?.response?.status === 403;
        
        // Handle authentication errors with auto-logout
        if (isAuthError) {
          handleAutoLogout();
          return;
        }
        
        const errorMessage = error?.response?.data?.message || 
                            error?.message || 
                            "Failed to load settings";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoadingSettings(false);
      }
    };

    loadSettings();
  }, []);



  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: currentUser.fullName || currentUser.name || "",
      email: currentUser.email || "",
      role: (currentUser.role as UserRole) || UserRole.SALES_REPRESENTATIVE,
      customRole: currentUser.customRole || "",
      companyName: currentUser.companyName || "",
      companySize: (currentUser.companySize as CompanySize) || CompanySize.SIZE_1_10,
      industry: (currentUser.industry as Industry) || Industry.OTHER,
      customIndustry: currentUser.customIndustry || "",
      website: currentUser.website || "",
      phoneNumber: currentUser.phoneNumber || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Update selectedRole when form role changes and initialize with current user role
  React.useEffect(() => {
    if (currentUser.role) {
      setSelectedRole(currentUser.role);
    }
    const subscription = form.watch((value) => {
      if (value.role) {
        setSelectedRole(value.role);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, currentUser.role]);

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const updateProfile = async (data: ProfileForm) => {
    setIsUpdatingProfile(true);
    try {
      // Update profile via API
      // For sub users, exclude restricted fields (role, companyName, companySize, industry)
      const profileData: any = {
        fullName: data.name,
        email: data.email,
        website: data.website || undefined,
        phoneNumber: data.phoneNumber || undefined,
      };

      // Only include restricted fields if user is not a sub user
      if (!isSubUser) {
        profileData.role = data.role;
        profileData.customRole = data.customRole || undefined;
        profileData.companyName = data.companyName;
        profileData.companySize = data.companySize;
        profileData.industry = data.industry;
        profileData.customIndustry = data.customIndustry || undefined;
      }

      const updatedUser = await profileService.updateProfile(profileData);

      // Update password if provided
      if (data.newPassword && data.newPassword.trim() !== "") {
        await profileService.changePassword({
          currentPassword: data.currentPassword || "",
          newPassword: data.newPassword,
          confirmPassword: data.confirmPassword || "",
        });
      }

      // Update localStorage with new user data
      const userData = {
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        name: updatedUser.fullName,
        email: updatedUser.email,
        role: updatedUser.role,
        customRole: updatedUser.customRole,
        companyName: updatedUser.companyName,
        companySize: updatedUser.companySize,
        industry: updatedUser.industry,
        customIndustry: updatedUser.customIndustry,
        website: updatedUser.website,
        phoneNumber: updatedUser.phoneNumber,
      };
      localStorage.setItem("user", JSON.stringify(userData));

      // Dispatch custom event to notify header of user data change
      window.dispatchEvent(new CustomEvent("userUpdated"));

      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved successfully.",
      });

      // Reset form with updated values
      form.reset({
        ...data,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          "We couldn't update your profile. Please try again.";
      toast({
        title: "Profile Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  const saveNotifications = async ({ settings, pushToken, unsubscribePush }: SaveNotificationPayload) => {
    setIsSavingNotifications(true);
    try {
      // Prepare notification settings DTO
      const notificationDto: UpdateNotificationSettingsDto = {
        newLeads: settings.newLeads,
        followUps: settings.followUps,
        hotLeads: settings.hotLeads,
        conversions: settings.conversions,
        browserPush: settings.browserPush,
        dailySummary: settings.dailySummary,
        emailNotifications: settings.emailNotifications,
        pushSubscription: pushToken || undefined,
      };

      // Update via API
      const updated = await profileService.updateNotificationSettings(notificationDto);
      
      // Update local state
      setNotificationSettings({
        newLeads: updated.newLeads,
        followUps: updated.followUps,
        hotLeads: updated.hotLeads,
        conversions: updated.conversions,
        browserPush: updated.browserPush,
        dailySummary: updated.dailySummary,
        emailNotifications: updated.emailNotifications,
        pushSubscription: updated.pushSubscription,
      });

      if (pushToken) {
        localStorage.setItem('fcmToken', pushToken);
      } else if (unsubscribePush) {
        localStorage.removeItem('fcmToken');
      }

      toast({
        title: "Success",
        description: "Notification settings saved successfully",
      });
    } catch (error: any) {
      console.error("Error saving notifications:", error);
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          "Failed to save notification settings. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const [isSavingSecurity, setIsSavingSecurity] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  const saveSecurity = async (data: any) => {
    setIsSavingSecurity(true);
    try {
      // Prepare security settings DTO
      const securityDto: UpdateSecuritySettingsDto = {
        twoFactorEnabled: data.twoFactorEnabled,
        loginNotifications: data.loginNotifications,
        sessionTimeout: data.sessionTimeout as '15' | '30' | '60' | '120' | '240',
      };

      // Update via API
      const updated = await profileService.updateSecuritySettings(securityDto);
      
      // Update local state
      setSecuritySettings({
        twoFactorEnabled: updated.twoFactorEnabled,
        loginNotifications: updated.loginNotifications,
        sessionTimeout: updated.sessionTimeout,
        apiKey: updated.apiKey || apiKey,
      });
      
      if (updated.apiKey) {
        setApiKey(updated.apiKey);
      }

      toast({
        title: "Success",
        description: "Security settings saved successfully",
      });
    } catch (error: any) {
      console.error("Error saving security:", error);
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          "Failed to save security settings";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSavingSecurity(false);
    }
  };

  const enable2FA = async () => {
    setIs2FAOperationInProgress(true);
    try {
      const updated = await profileService.updateSecuritySettings({
        twoFactorEnabled: true,
      });
      setSecuritySettings(prev => ({
        ...prev,
        twoFactorEnabled: updated.twoFactorEnabled,
      }));
      toast({
        title: "Success",
        description: "Two-factor authentication enabled successfully!",
      });
    } catch (error: any) {
      console.error("Error enabling 2FA:", error);
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          "Failed to enable two-factor authentication";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIs2FAOperationInProgress(false);
    }
  };

  const disable2FA = async () => {
    setIs2FAOperationInProgress(true);
    try {
      const updated = await profileService.updateSecuritySettings({
        twoFactorEnabled: false,
      });
      setSecuritySettings(prev => ({
        ...prev,
        twoFactorEnabled: updated.twoFactorEnabled,
      }));
      toast({
        title: "Success",
        description: "Two-factor authentication disabled successfully!",
      });
    } catch (error: any) {
      console.error("Error disabling 2FA:", error);
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          "Failed to disable two-factor authentication";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIs2FAOperationInProgress(false);
    }
  };

  const savePreferences = async (data: any) => {
    setIsSavingPreferences(true);
    try {
      // Prepare preferences DTO
      const preferencesDto: UpdateUserPreferencesDto = {
        defaultView: data.defaultView as LeadViewType,
        itemsPerPage: data.itemsPerPage as '10' | '20' | '30' | '40' | '50',
        autoSave: data.autoSave,
        compactMode: data.compactMode,
        exportFormat: data.exportFormat as 'csv' | 'xlsx' | 'pdf',
        exportNotes: data.exportNotes,
      };

      // Update via API
      const updated = await profileService.updateUserPreferences(preferencesDto);
      
      // Update local state
      setPreferenceSettings({
        defaultView: updated.defaultView,
        itemsPerPage: updated.itemsPerPage,
        autoSave: updated.autoSave,
        compactMode: updated.compactMode,
        exportFormat: updated.exportFormat,
        exportNotes: updated.exportNotes,
      });

      toast({
        title: "Success",
        description: "Preferences saved successfully",
      });
    } catch (error: any) {
      console.error("Error saving preferences:", error);
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          "Failed to save preferences";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const onSubmit = (data: ProfileForm) => {
    console.log('Form submission data:', data);

    // Only send password fields if user is actually changing password
    const submitData = { ...data };
    if (!data.newPassword || data.newPassword.trim() === '') {
      delete submitData.currentPassword;
      delete submitData.newPassword;
      delete submitData.confirmPassword;
    } else {
      console.log('Password change detected:', {
        hasCurrentPassword: !!data.currentPassword,
        hasNewPassword: !!data.newPassword,
        hasConfirmPassword: !!data.confirmPassword,
        passwordsMatch: data.newPassword === data.confirmPassword
      });
    }

    console.log('Submitting data:', submitData);
    updateProfile(submitData);
  };

  const buildNotificationPayload = async (): Promise<SaveNotificationPayload> => {
    const baseSettings = {
      newLeads: notificationSettings.newLeads,
      followUps: notificationSettings.followUps,
      hotLeads: notificationSettings.hotLeads,
      conversions: notificationSettings.conversions,
      browserPush: notificationSettings.browserPush,
      dailySummary: notificationSettings.dailySummary,
      emailNotifications: notificationSettings.emailNotifications,
      pushSubscription: notificationSettings.pushSubscription ?? null,
    };

    if (!notificationSettings.browserPush) {
      return {
        settings: {
          ...baseSettings,
          pushSubscription: null,
        },
        unsubscribePush: true,
      };
    }

    if (
      !isPushConfigAvailable ||
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      typeof navigator === 'undefined' ||
      !('serviceWorker' in navigator)
    ) {
      throw new Error('PushUnsupported');
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('PushPermissionDenied');
      }
    } else if (Notification.permission === 'denied') {
      throw new Error('PushPermissionDenied');
    }

    const token = await requestFirebaseToken();
    if (!token) {
      throw new Error('PushTokenUnavailable');
    }

    const deviceInfo = navigator.userAgent ? navigator.userAgent.slice(0, 255) : 'browser';
    const nowIso = new Date().toISOString();

    return {
      settings: {
        ...baseSettings,
        pushSubscription: {
          tokens: [
            {
              token,
              platform: 'web',
              updatedAt: nowIso,
              device: deviceInfo,
            },
          ],
        },
      },
      pushToken: token,
    };
  };

  const handleSaveNotifications = async () => {
    console.log('=== SAVING NOTIFICATION SETTINGS ===');
    console.log('Current state:', notificationSettings);

    let payload: SaveNotificationPayload;

    try {
      payload = await buildNotificationPayload();
    } catch (error: any) {
      if (error?.message === 'PushPermissionDenied') {
        toast({
          title: "Push Notifications",
          description: "We need notification permission to enable browser push alerts. Please allow notifications in your browser settings.",
          variant: "destructive",
        });
      } else if (error?.message === 'PushUnsupported') {
        toast({
          title: "Push Notifications",
          description: "Browser push notifications are not supported in this environment or Firebase is not configured.",
          variant: "destructive",
        });
      } else if (error?.message === 'PushTokenUnavailable') {
        toast({
          title: "Push Notifications",
          description: "We couldn't generate a push token for this browser. Please try again.",
          variant: "destructive",
        });
      } else {
        console.error('Failed to prepare notification settings:', error);
        toast({
          title: "Error",
          description: "Something went wrong while preparing your notification preferences.",
          variant: "destructive",
        });
      }
      return;
    }

    saveNotifications(payload);
  };

  const handleSaveSecurity = () => {
    saveSecurity(securitySettings);
  };

  const handleSavePreferences = () => {
    savePreferences(preferenceSettings);
  };

  const handleSaveAll = async () => {
    try {
      // Build notification payload first
      const notificationPayload = await buildNotificationPayload();
      
      // Save all settings sequentially
      await saveNotifications(notificationPayload);
      await saveSecurity(securitySettings);
      await savePreferences(preferenceSettings);

      toast({
        title: "Success",
        description: "All settings have been saved successfully",
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
    }
  };

  const handleEnable2FA = () => {
    if (securitySettings.twoFactorEnabled) {
      disable2FA();
    } else {
      enable2FA();
    }
  };


  const handleManageSessions = () => {
    toast({
      title: "Session Management",
      description: "Active sessions management panel would open here. Feature coming soon!",
    });
  };

  const handleRegenerateAPI = () => {
    const newKey = `lf_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    setApiKey(newKey);
    localStorage.setItem('userApiKey', newKey);
    const updated = { ...securitySettings, apiKey: newKey };
    localStorage.setItem("securitySettings", JSON.stringify(updated));
    setSecuritySettings(updated);
    toast({
      title: "API Key Regenerated",
      description: "Your API key has been regenerated successfully",
    });
  };

  const handleExportData = () => {
    // Mock export - just show toast
    toast({
      title: "Export Successful",
      description: "Your data has been exported successfully",
    });
  };

  const handleDeleteAllLeads = () => {
    if (window.confirm('Are you sure you want to delete ALL your leads? This action cannot be undone.')) {
      // Mock delete - just show toast
      toast({
        title: "Leads Deleted",
        description: "Leads have been deleted successfully",
      });
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="mb-4 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900" data-testid="page-title">Settings</h2>
          <p className="mt-1 text-xs sm:text-sm text-gray-600">Manage your account settings and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-4 sm:space-y-6">
          <TabsList className={`grid w-full gap-1 sm:gap-2 ${currentUser.role === UserRole.MANAGEMENT ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="profile" className="flex flex-col items-center gap-1 text-xs sm:text-sm px-1 sm:px-3 py-2 min-h-[60px] sm:min-h-0">
              <User className="h-4 w-4 sm:h-4 sm:w-4" />
              <span className="text-center">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex flex-col items-center gap-1 text-xs sm:text-sm px-1 sm:px-3 py-2 min-h-[60px] sm:min-h-0">
              <Bell className="h-4 w-4 sm:h-4 sm:w-4" />
              <span className="text-center"> Notifications & Security</span>
            </TabsTrigger>
            {currentUser.role === UserRole.MANAGEMENT && (
              <TabsTrigger value="users" className="flex flex-col items-center gap-1 text-xs sm:text-sm px-1 sm:px-3 py-2 min-h-[60px] sm:min-h-0">
                <Users className="h-4 w-4 sm:h-4 sm:w-4" />
                <span className="text-center">Users</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your account details and password
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="name" className="text-xs sm:text-sm">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      className="text-sm sm:text-base"
                      {...form.register("name")}
                      data-testid="input-name"
                    />
                    {form.formState.errors.name && (
                      <p className="text-xs sm:text-sm text-red-600">{form.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="email" className="text-xs sm:text-sm">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      className="text-sm sm:text-base"
                      {...form.register("email")}
                      data-testid="input-email"
                    />
                    {form.formState.errors.email && (
                      <p className="text-xs sm:text-sm text-red-600">{form.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="role" className="text-xs sm:text-sm">Role</Label>
                    <Select 
                      value={form.watch("role")} 
                      onValueChange={(value) => {
                        form.setValue("role", value as UserRole);
                        setSelectedRole(value);
                        if (value !== UserRole.OTHER) {
                          form.setValue("customRole", "");
                        }
                      }}
                      disabled={isSubUser}
                    >
                      <SelectTrigger className={`text-sm sm:text-base ${isSubUser ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`} data-testid="select-role">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(UserRole).map((role) => (
                          <SelectItem key={role} value={role}>
                            {role === UserRole.SALES_REPRESENTATIVE && "Sales Representative"}
                            {role === UserRole.SALES_MANAGER && "Sales Manager"}
                            {role === UserRole.MANAGEMENT && "Management"}
                            {role === UserRole.OTHER && "Other"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.role && (
                      <p className="text-xs sm:text-sm text-red-600">{form.formState.errors.role.message}</p>
                    )}
                  </div>

                  {selectedRole === UserRole.OTHER && (
                    <div className="space-y-1 sm:space-y-2">
                      <Label htmlFor="customRole" className="text-xs sm:text-sm">Specify Role</Label>
                      <Input
                        id="customRole"
                        type="text"
                        placeholder="Enter your role"
                        className={`text-sm sm:text-base ${isSubUser ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                        {...form.register("customRole")}
                        disabled={isSubUser}
                        data-testid="input-custom-role"
                      />
                      {form.formState.errors.customRole && (
                        <p className="text-xs sm:text-sm text-red-600">{form.formState.errors.customRole.message}</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="companyName" className="text-xs sm:text-sm">Company Name</Label>
                    <Input
                      id="companyName"
                      type="text"
                      placeholder="Acme Corporation"
                      className={`text-sm sm:text-base ${isSubUser ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                      {...form.register("companyName")}
                      disabled={isSubUser}
                      data-testid="input-company-name"
                    />
                    {form.formState.errors.companyName && (
                      <p className="text-xs sm:text-sm text-red-600">{form.formState.errors.companyName.message}</p>
                    )}
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="companySize" className="text-xs sm:text-sm">Company Size</Label>
                    <Select 
                      value={form.watch("companySize")} 
                      onValueChange={(value) => form.setValue("companySize", value as CompanySize)}
                      disabled={isSubUser}
                    >
                      <SelectTrigger className={`text-sm sm:text-base ${isSubUser ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`} data-testid="select-company-size">
                        <SelectValue placeholder="Select company size" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(CompanySize).map((size) => (
                          <SelectItem key={size} value={size}>
                            {size} employees
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.companySize && (
                      <p className="text-xs sm:text-sm text-red-600">{form.formState.errors.companySize.message}</p>
                    )}
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="industry" className="text-xs sm:text-sm">Industry</Label>
                    <Select 
                      value={form.watch("industry")} 
                      onValueChange={(value) => {
                        form.setValue("industry", value as Industry);
                        if (value !== Industry.OTHER) {
                          form.setValue("customIndustry", "");
                        }
                      }}
                      disabled={isSubUser}
                    >
                      <SelectTrigger className={`text-sm sm:text-base ${isSubUser ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`} data-testid="select-industry">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(Industry).map((industry) => (
                          <SelectItem key={industry} value={industry}>
                            {industry.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.industry && (
                      <p className="text-xs sm:text-sm text-red-600">{form.formState.errors.industry.message}</p>
                    )}
                  </div>

                  {form.watch("industry") === Industry.OTHER && (
                    <div className="space-y-1 sm:space-y-2">
                      <Label htmlFor="customIndustry" className="text-xs sm:text-sm">Specify Industry</Label>
                      <Input
                        id="customIndustry"
                        type="text"
                        placeholder="Enter your industry"
                        className={`text-sm sm:text-base ${isSubUser ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                        {...form.register("customIndustry")}
                        disabled={isSubUser}
                        data-testid="input-custom-industry"
                      />
                      {form.formState.errors.customIndustry && (
                        <p className="text-xs sm:text-sm text-red-600">{form.formState.errors.customIndustry.message}</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="website" className="text-xs sm:text-sm">Website (Optional)</Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="https://www.example.com"
                      className="text-sm sm:text-base"
                      {...form.register("website")}
                      data-testid="input-website"
                    />
                    {form.formState.errors.website && (
                      <p className="text-xs sm:text-sm text-red-600">{form.formState.errors.website.message}</p>
                    )}
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="phoneNumber" className="text-xs sm:text-sm">Phone Number (Optional)</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      className="text-sm sm:text-base"
                      {...form.register("phoneNumber")}
                      data-testid="input-phone-number"
                    />
                    {form.formState.errors.phoneNumber && (
                      <p className="text-xs sm:text-sm text-red-600">{form.formState.errors.phoneNumber.message}</p>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-3 sm:space-y-4">
                    <h3 className="text-base sm:text-lg font-medium">Change Password</h3>

                    <div className="space-y-1 sm:space-y-2">
                      <Label htmlFor="currentPassword" className="text-xs sm:text-sm">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showCurrentPassword ? "text" : "password"}
                          placeholder="Enter current password"
                          className="text-sm sm:text-base"
                          {...form.register("currentPassword")}
                          data-testid="input-current-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-2 sm:px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" /> : <Eye className="h-3 w-3 sm:h-4 sm:w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1 sm:space-y-2">
                      <Label htmlFor="newPassword" className="text-xs sm:text-sm">New Password</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          placeholder="Enter new password"
                          className="text-sm sm:text-base"
                          {...form.register("newPassword")}
                          data-testid="input-new-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-2 sm:px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" /> : <Eye className="h-3 w-3 sm:h-4 sm:w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1 sm:space-y-2">
                      <Label htmlFor="confirmPassword" className="text-xs sm:text-sm">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm new password"
                          className="text-sm sm:text-base"
                          {...form.register("confirmPassword")}
                          data-testid="input-confirm-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-2 sm:px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" /> : <Eye className="h-3 w-3 sm:h-4 sm:w-4" />}
                        </Button>
                      </div>
                      {form.formState.errors.confirmPassword && (
                        <p className="text-xs sm:text-sm text-red-600">{form.formState.errors.confirmPassword.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={isUpdatingProfile}
                      className="text-xs sm:text-sm px-3 sm:px-4 py-2"
                      data-testid="button-save-profile"
                    >
                      {isUpdatingProfile ? (
                        "Saving..."
                      ) : (
                        <>
                          <Save className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4 sm:space-y-6">
            {/* Privacy Notice */}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Email Notifications
                </CardTitle>
                <CardDescription>
                  Choose which email notifications you'd like to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                {isLoadingSettings ? (
                  <InlineLoader text="Loading email notification settings..." />
                ) : (
                  <>
                    {/* Master Email Notifications Toggle */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications" className="text-sm sm:text-base font-semibold">Enable Email Notifications</Label>
                    <p className="text-xs sm:text-sm text-gray-500">Turn on/off all email notifications</p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, emailNotifications: checked }))}
                    data-testid="switch-email-notifications"
                  />
                </div>

                {/* Individual Email Notification Settings */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="new-leads" className="text-xs sm:text-sm">New Lead Notifications</Label>
                    <p className="text-xs sm:text-sm text-gray-500">Get notified when new leads are added</p>
                  </div>
                  <Switch
                    id="new-leads"
                    checked={notificationSettings.newLeads}
                    disabled={!notificationSettings.emailNotifications}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, newLeads: checked }))}
                    data-testid="switch-new-leads"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="follow-ups" className="text-xs sm:text-sm">Follow-up Reminders</Label>
                    <p className="text-xs sm:text-sm text-gray-500">Receive reminders for scheduled follow-ups</p>
                  </div>
                  <Switch
                    id="follow-ups"
                    checked={notificationSettings.followUps}
                    disabled={!notificationSettings.emailNotifications}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, followUps: checked }))}
                    data-testid="switch-follow-ups"
                  />
                </div>
                {!notificationSettings.emailNotifications && (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-md">
                    Email notifications are currently disabled. Enable the master toggle above to receive email notifications.
                  </p>
                )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Push Notifications
                </CardTitle>
                <CardDescription>
                  Configure browser and mobile push notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                {isLoadingSettings ? (
                  <InlineLoader text="Loading push notification settings..." />
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="browser-push" className="text-xs sm:text-sm">Browser Notifications</Label>
                    <p className="text-xs sm:text-sm text-gray-500">Show notifications in your browser</p>
                  </div>
                  <Switch
                    id="browser-push"
                    checked={notificationSettings.browserPush}
                    disabled={!notificationSettings.browserPush && !canEnableBrowserPush}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, browserPush: checked }))}
                    data-testid="switch-browser-push"
                  />
                </div>
                {!canEnableBrowserPush && (
                  <p className="text-xs text-gray-400">
                    Browser push notifications require HTTPS, service worker support, and Firebase configuration.
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="daily-summary" className="text-xs sm:text-sm">Daily Summary</Label>
                    <p className="text-xs sm:text-sm text-gray-500">Daily digest of your lead activity</p>
                  </div>
                  <Switch
                    id="daily-summary"
                    checked={notificationSettings.dailySummary}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, dailySummary: checked }))}
                    data-testid="switch-daily-summary"
                  />
                </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Account Security
                </CardTitle>
                <CardDescription>
                  Manage your account security settings
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                {isLoadingSettings ? (
                  <InlineLoader text="Loading security settings..." />
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-xs sm:text-sm">Two-Factor Authentication</Label>
                    <p className="text-xs sm:text-sm text-gray-500">Add an extra layer of security to your account</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEnable2FA}
                    disabled={is2FAOperationInProgress}
                    className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                    data-testid="button-enable-2fa"
                  >
                    {is2FAOperationInProgress ? (
                      <>
                        <ButtonLoader size={12} color="#6b7280" />
                        <span className="ml-1 sm:ml-2 text-xs sm:text-sm">
                          {securitySettings.twoFactorEnabled ? 'Disabling...' : 'Enabling...'}
                        </span>
                      </>
                    ) : (
                      securitySettings.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'
                    )}
                  </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  Application Preferences
                </CardTitle>
                <CardDescription>
                  Customize your LeadsFlow experience
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                {isLoadingSettings ? (
                  <InlineLoader text="Loading application preferences..." />
                ) : (
                  <>
                    <div className="space-y-1 sm:space-y-2">
                      <Label className="text-xs sm:text-sm">Default Lead View</Label>
                  <Select
                    value={preferenceSettings.defaultView}
                    onValueChange={(value) => setPreferenceSettings(prev => ({ ...prev, defaultView: value }))}
                    data-testid="select-default-view"
                  >
                    <SelectTrigger className="text-sm sm:text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(LeadViewType).map((view) => (
                        <SelectItem key={view} value={view}>
                          {view === LeadViewType.TABLE && "Table View"}
                          {view === LeadViewType.GRID && "Grid View"}
                          {view === LeadViewType.LIST && "List View"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">Items Per Page</Label>
                  <Select
                    value={preferenceSettings.itemsPerPage}
                    onValueChange={(value) => setPreferenceSettings(prev => ({ ...prev, itemsPerPage: value }))}
                    data-testid="select-items-per-page"
                  >
                    <SelectTrigger className="text-sm sm:text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 items</SelectItem>
                      <SelectItem value="20">20 items</SelectItem>
                      <SelectItem value="50">50 items</SelectItem>
                      <SelectItem value="100">100 items</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveAll}
                disabled={
                  isSavingNotifications ||
                  isSavingSecurity ||
                  isSavingPreferences
                }
                className="text-xs sm:text-sm px-3 sm:px-4 py-2"
                data-testid="button-save-all"
              >
                {isSavingNotifications ||
                isSavingSecurity ||
                isSavingPreferences ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    Save All Settings
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Users Tab - Only visible for Management role */}
          {currentUser.role === UserRole.MANAGEMENT && (
            <TabsContent value="users" className="space-y-4 sm:space-y-6">
              <UserManagement />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}

// User Management Component
function UserManagement() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<SubUserResponse | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  // Handler for auto-logout on authentication failure
  const handleAutoLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    toast({
      title: "Session Expired",
      description: "Your session has expired. Please login again.",
      variant: "destructive",
    });
    setLocation('/login');
  };

  // Check if error is authentication error and handle it
  const handleApiError = (error: any) => {
    const isAuthError = error?.response?.status === 401 || error?.response?.status === 403;
    
    if (isAuthError) {
      handleAutoLogout();
      return true; // Indicates auth error was handled
    }
    
    return false; // Not an auth error
  };

  // Load users from API
  const [users, setUsers] = useState<SubUserResponse[]>([]);

  useEffect(() => {
    const loadUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const subUsers = await profileService.getAllSubUsers();
        setUsers(subUsers);
      } catch (error: any) {
        console.error("Error loading users:", error);
        
        // Check if it's an authentication error
        if (handleApiError(error)) {
          return;
        }
        
        const errorMessage = error?.response?.data?.message || 
                            error?.message || 
                            "Failed to load users";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoadingUsers(false);
      }
    };

    loadUsers();
  }, []);

  const userFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().optional().or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
    role: z.nativeEnum(UserRole),
    customRole: z.string().optional(),
    companyName: z.string().min(1, "Company name is required"),
    canViewLeads: z.boolean().default(true),
    canEditLeads: z.boolean().default(true),
    canAddLeads: z.boolean().default(true),
  }).refine((data) => {
    // If password is provided, it must be at least 6 characters
    if (data.password && data.password.length > 0) {
      return data.password.length >= 6;
    }
    return true;
  }, {
    message: "Password must be at least 6 characters",
    path: ["password"],
  }).refine((data) => {
    // If password is provided, confirmPassword must match
    if (data.password && data.password.length > 0) {
      return data.password === data.confirmPassword;
    }
    return true;
  }, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }).refine((data) => {
    // Custom role is required if role is OTHER
    if (data.role === UserRole.OTHER) {
      return data.customRole && data.customRole.trim() !== "";
    }
    return true;
  }, {
    message: "Please specify your role",
    path: ["customRole"],
  });

  type UserFormData = z.infer<typeof userFormSchema>;

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: UserRole.SALES_REPRESENTATIVE,
      customRole: "",
      companyName: currentUser.companyName || "",
      canViewLeads: true,
      canEditLeads: true,
      canAddLeads: true,
    },
  });

  const handleAddUser = async (data: UserFormData) => {
    setIsSubmittingUser(true);
    try {
      console.log("Creating user with data:", data);
      
      const createDto: CreateSubUserDto = {
        fullName: data.name,
        email: data.email,
        password: data.password || "",
        confirmPassword: data.confirmPassword || "",
        role: data.role,
        customRole: data.customRole || undefined,
        companyName: data.companyName,
        canViewLeads: data.canViewLeads,
        canEditLeads: data.canEditLeads,
        canAddLeads: data.canAddLeads,
      };

      console.log("Sending createSubUser request with DTO:", createDto);
      const newUser = await profileService.createSubUser(createDto);
      console.log("User created successfully:", newUser);
      
      setUsers((prev) => [...prev, newUser]);
      
      toast({
        title: "Success",
        description: "User created successfully",
      });
      handleCloseDialog();
    } catch (error: any) {
      console.error("Error creating user:", error);
      console.error("Error response:", error?.response);
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error ||
                          error?.message || 
                          "Failed to create user";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleEditUser = async (data: UserFormData) => {
    if (!editingUser) return;

    setIsSubmittingUser(true);
    try {
      // Update permissions
      const permissionsDto: UpdateSubUserPermissionsDto = {
        canViewLeads: data.canViewLeads,
        canEditLeads: data.canEditLeads,
        canAddLeads: data.canAddLeads,
      };

      await profileService.updateSubUserPermissions(editingUser.id, permissionsDto);
      
      // Reload users to get updated data
      const updatedUsers = await profileService.getAllSubUsers();
      setUsers(updatedUsers);

      toast({
        title: "Success",
        description: "User updated successfully",
      });
      handleCloseDialog();
    } catch (error: any) {
      console.error("Error updating user:", error);
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          "Failed to update user";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (userId === currentUser.id) {
      toast({
        title: "Error",
        description: "You cannot delete your own account",
        variant: "destructive",
      });
      return;
    }

    if (window.confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      try {
        await profileService.deleteSubUser(userId);
        setUsers((prev) => prev.filter((user) => user.id !== userId));
        toast({
          title: "Success",
          description: "User deleted successfully",
        });
      } catch (error: any) {
        console.error("Error deleting user:", error);
        const errorMessage = error?.response?.data?.message || 
                            error?.message || 
                            "Failed to delete user";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  };

  const handleEditClick = (user: any) => {
    setEditingUser(user);
    setShowAddForm(true);
    setShowPassword(false);
    setShowConfirmPassword(false);
    form.reset({
      name: user.fullName || user.name,
      email: user.email,
      password: "",
      confirmPassword: "",
      role: (user.role as UserRole) || UserRole.SALES_REPRESENTATIVE,
      customRole: user.customRole || "",
      companyName: user.companyName || "",
      canViewLeads: user.permissions?.canViewLeads ?? true,
      canEditLeads: user.permissions?.canEditLeads ?? true,
      canAddLeads: user.permissions?.canAddLeads ?? true,
    });
  };

  const handleOpenDialog = () => {
    setShowAddForm(true);
    setEditingUser(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
    form.reset({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: UserRole.SALES_REPRESENTATIVE,
      customRole: "",
      companyName: currentUser.companyName || "",
      canViewLeads: true,
      canEditLeads: true,
      canAddLeads: true,
    });
  };

  const handleCloseDialog = () => {
    setShowAddForm(false);
    setEditingUser(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsSubmittingUser(false);
    form.reset();
  };

  const onSubmit = async (data: UserFormData) => {
    console.log("Form submitted with data:", data);
    console.log("Is editing user:", editingUser);
    
    // Validate password is required when creating new user
    if (!editingUser) {
      if (!data.password || data.password.trim() === "") {
        console.log("Password validation failed: password is empty");
        toast({
          title: "Error",
          description: "Password is required",
          variant: "destructive",
        });
        form.setError("password", { message: "Password is required" });
        return;
      }
      if (data.password.length < 6) {
        console.log("Password validation failed: password too short");
        toast({
          title: "Error",
          description: "Password must be at least 6 characters",
          variant: "destructive",
        });
        form.setError("password", { message: "Password must be at least 6 characters" });
        return;
      }
    }

    // Validate password match
    if (data.password && data.password !== data.confirmPassword) {
      console.log("Password validation failed: passwords don't match");
      toast({
        title: "Error",
        description: "Passwords don't match",
        variant: "destructive",
      });
      form.setError("confirmPassword", { message: "Passwords don't match" });
      return;
    }

    // Validate custom role if role is OTHER
    if (data.role === UserRole.OTHER && (!data.customRole || data.customRole.trim() === "")) {
      console.log("Custom role validation failed");
      toast({
        title: "Error",
        description: "Please specify a custom role",
        variant: "destructive",
      });
      form.setError("customRole", { message: "Please specify your role" });
      return;
    }

    // Validate company name
    if (!data.companyName || data.companyName.trim() === "") {
      console.log("Company name validation failed");
      toast({
        title: "Error",
        description: "Company name is required",
        variant: "destructive",
      });
      form.setError("companyName", { message: "Company name is required" });
      return;
    }

    console.log("All validations passed, calling handler");
    if (editingUser) {
      await handleEditUser(data);
    } else {
      await handleAddUser(data);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader>
          <div className="flex justify-between items-center">
            <div>
                <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
                </CardTitle>
                <CardDescription>
                Create and manage user access. Control permissions for viewing, editing, and adding leads.
                </CardDescription>
            </div>
            <Button
              onClick={handleOpenDialog}
              className="text-xs sm:text-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New User
            </Button>
          </div>
              </CardHeader>
      </Card>

      {/* Add/Edit User Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Create New User"}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Update user information and permissions"
                : "Add a new user and set their permissions for accessing leads data"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="John Doe"
                  className="text-sm sm:text-base"
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-red-600">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register("email")}
                  placeholder="john@example.com"
                  className="text-sm sm:text-base"
                />
                {form.formState.errors.email && (
                  <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
                )}
              </div>

              {!editingUser && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        {...form.register("password")}
                        placeholder="Minimum 6 characters"
                        className="text-sm sm:text-base pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {form.formState.errors.password && (
                      <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        {...form.register("confirmPassword")}
                        placeholder="Confirm password"
                        className="text-sm sm:text-base pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {form.formState.errors.confirmPassword && (
                      <p className="text-xs text-red-600">{form.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>
                </>
              )}

              {editingUser && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password (Optional)</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        {...form.register("password")}
                        placeholder="Leave blank to keep current password"
                        className="text-sm sm:text-base pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {form.formState.errors.password && (
                      <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        {...form.register("confirmPassword")}
                        placeholder="Confirm new password"
                        className="text-sm sm:text-base pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {form.formState.errors.confirmPassword && (
                      <p className="text-xs text-red-600">{form.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                  <Select
                  value={form.watch("role")}
                  onValueChange={(value) => {
                    form.setValue("role", value as UserRole);
                    if (value !== UserRole.OTHER) {
                      form.setValue("customRole", "");
                    }
                  }}
                  >
                    <SelectTrigger className="text-sm sm:text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(UserRole).map((role) => (
                        <SelectItem key={role} value={role}>
                          {role === UserRole.SALES_REPRESENTATIVE && "Sales Representative"}
                          {role === UserRole.SALES_MANAGER && "Sales Manager"}
                          {role === UserRole.MANAGEMENT && "Management"}
                          {role === UserRole.OTHER && "Other"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

              {form.watch("role") === UserRole.OTHER && (
                <div className="space-y-2">
                  <Label htmlFor="customRole">Custom Role *</Label>
                  <Input
                    id="customRole"
                    {...form.register("customRole")}
                    placeholder="Enter custom role"
                    className="text-sm sm:text-base"
                  />
                  {form.formState.errors.customRole && (
                    <p className="text-xs text-red-600">Please specify your role</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  {...form.register("companyName")}
                  placeholder="Enter company name"
                  className="text-sm sm:text-base"
                />
                {form.formState.errors.companyName && (
                  <p className="text-xs text-red-600">{form.formState.errors.companyName.message}</p>
                )}
              </div>
                </div>

                <Separator />

            <div className="space-y-4">
              <h4 className="font-medium text-sm sm:text-base">Lead Access Permissions</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label htmlFor="canViewLeads">View Leads</Label>
                    <p className="text-xs text-gray-500">Can view lead data</p>
                    </div>
                  <Switch
                    id="canViewLeads"
                    checked={form.watch("canViewLeads")}
                    onCheckedChange={(checked) => form.setValue("canViewLeads", checked)}
                  />
                  </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label htmlFor="canEditLeads">Edit Leads</Label>
                    <p className="text-xs text-gray-500">Can edit existing leads</p>
                  </div>
                  <Switch
                    id="canEditLeads"
                    checked={form.watch("canEditLeads")}
                    onCheckedChange={(checked) => form.setValue("canEditLeads", checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label htmlFor="canAddLeads">Add Leads</Label>
                    <p className="text-xs text-gray-500">Can create new leads</p>
                </div>
                  <Switch
                    id="canAddLeads"
                    checked={form.watch("canAddLeads")}
                    onCheckedChange={(checked) => form.setValue("canAddLeads", checked)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                className="text-xs sm:text-sm"
                disabled={isSubmittingUser}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="text-xs sm:text-sm"
                disabled={isSubmittingUser}
              >
                {isSubmittingUser ? (
                  <div className="flex items-center">
                    <ButtonLoader size={14} color="#ffffff" />
                    <span className="ml-2">
                      {editingUser ? "Updating..." : "Creating..."}
                    </span>
                  </div>
                ) : (
                  editingUser ? "Update User" : "Create User"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({users.length})</CardTitle>
          <CardDescription>Manage user access and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <InlineLoader text="Loading users..." />
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No users found. Create your first user to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user: any) => (
                <Card key={user.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                            <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-sm sm:text-base">{user.fullName || user.name}</h4>
                              {user.id === currentUser.id && (
                                <Badge variant="outline" className="text-xs">Current User</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{user.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {user.role === UserRole.OTHER ? user.customRole || "Other" : user.role}
                              </Badge>
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                {user.permissions?.canViewLeads && (
                                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                                    View
                                  </span>
                                )}
                                {user.permissions?.canEditLeads && (
                                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                                    Edit
                                  </span>
                                )}
                                {user.permissions?.canAddLeads && (
                                  <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">
                                    Add
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(user)}
                          className="text-xs sm:text-sm"
                        >
                          <Edit className="h-4 w-4" />
              </Button>
                        {user.id !== currentUser.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id, user.fullName || user.name)}
                            className="text-red-600 hover:text-red-700 text-xs sm:text-sm"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
            </div>
      </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}