import { useState, useEffect } from "react";
import AppLayout from "@/components/app-layout";
import LeadTable from "@/components/lead-table";
import LeadForm from "@/components/lead-form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { LeadResponse } from "@/lib/apis";
import type { Lead } from "../../shared/schema";
import { profileService } from "@/lib/apis";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Convert LeadResponse to Lead format for LeadForm compatibility
  const convertLeadResponseToLead = (leadResponse: LeadResponse): Lead => {
    return {
      id: leadResponse.id,
      userId: leadResponse.userId?.toString() || null,
      name: leadResponse.name,
      phoneNumber: leadResponse.phoneNumber,
      email: leadResponse.email || null,
      dateOfBirth: leadResponse.dateOfBirth || null,
      city: leadResponse.city || null,
      state: leadResponse.state || null,
      country: leadResponse.country || null,
      pincode: leadResponse.pincode || null,
      companyName: leadResponse.companyName || null,
      designation: leadResponse.designation || null,
      customerCategory: (leadResponse.customerCategory || "potential") as "existing" | "potential",
      lastContactedDate: leadResponse.lastContactedDate || null,
      lastContactedBy: leadResponse.lastContactedBy || null,
      nextFollowupDate: leadResponse.nextFollowupDate || null,
      customerInterestedIn: leadResponse.customerInterestedIn || null,
      preferredCommunicationChannel: leadResponse.preferredCommunicationChannel || null,
      customCommunicationChannel: leadResponse.customCommunicationChannel || null,
      leadSource: (leadResponse.leadSource || "website") as any,
      customLeadSource: leadResponse.customLeadSource || null,
      customReferralSource: leadResponse.customReferralSource || null,
      customGeneratedBy: leadResponse.customGeneratedBy || null,
      leadStatus: (leadResponse.leadStatus || "new") as any,
      leadCreatedBy: leadResponse.leadCreatedBy || null,
      additionalNotes: leadResponse.additionalNotes || null,
      sector: leadResponse.sector || null,
      customSector: leadResponse.customSector || null,
      createdAt: leadResponse.createdAt ? new Date(leadResponse.createdAt) : new Date(),
    };
  };
  const [filters, setFilters] = useState({
    search: "",
    status: [] as string[],
    category: "",
    city: "",
    sector: "",
  });

  // Load user preferences from API
  const [userPreferences, setUserPreferences] = useState<{
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

  // Load preferences from API
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const preferences = await profileService.getProfilePreferences();
        console.log('[Dashboard] Loaded preferences:', preferences.preferences);
        setUserPreferences({
          defaultView: preferences.preferences.defaultView,
          itemsPerPage: preferences.preferences.itemsPerPage,
          autoSave: preferences.preferences.autoSave,
          compactMode: preferences.preferences.compactMode,
          exportFormat: preferences.preferences.exportFormat,
          exportNotes: preferences.preferences.exportNotes,
        });
      } catch (error: any) {
        console.error("Error loading preferences:", error);
        
        // Check if it's an authentication error (401 or 403)
        const isAuthError = error?.response?.status === 401 || error?.response?.status === 403;
        
        // Handle authentication errors with auto-logout
        if (isAuthError) {
          handleAutoLogout();
          return;
        }
        
        // Use defaults on error
      }
    };

    loadPreferences();
  }, []);

  // Callback to refresh preferences after they're updated
  const handlePreferencesUpdate = async () => {
    try {
      const preferences = await profileService.getProfilePreferences();
      setUserPreferences({
        defaultView: preferences.preferences.defaultView,
        itemsPerPage: preferences.preferences.itemsPerPage,
        autoSave: preferences.preferences.autoSave,
        compactMode: preferences.preferences.compactMode,
        exportFormat: preferences.preferences.exportFormat,
        exportNotes: preferences.preferences.exportNotes,
      });
    } catch (error: any) {
      console.error("Error refreshing preferences:", error);
    }
  };



  const handleEditLead = (lead: LeadResponse) => {
    setEditingLead(convertLeadResponseToLead(lead));
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingLead(null);
  };

  const handleFiltersChange = (newFilters: { search: string; status: string | string[]; category: string; city: string; sector: string; }) => {
    const normalizedStatus = Array.isArray(newFilters.status) ? newFilters.status : newFilters.status ? [newFilters.status] : [];
    
    // Only update if there's an actual change
    if (
      filters.search !== newFilters.search ||
      JSON.stringify(filters.status) !== JSON.stringify(normalizedStatus) ||
      filters.category !== newFilters.category ||
      filters.city !== newFilters.city ||
      filters.sector !== newFilters.sector
    ) {
      setFilters({
        ...newFilters,
        status: normalizedStatus
      });
    }
  };


  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <LeadTable 
          filters={filters} 
          onFiltersChange={handleFiltersChange}
          onEditLead={handleEditLead}
          userPreferences={userPreferences}
          onPreferencesUpdate={handlePreferencesUpdate}
          onAddNewLead={() => {
            setEditingLead(null);
            setIsFormOpen(true);
          }}
          exportFilters={filters}
        />

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <LeadForm 
              lead={editingLead} 
              onClose={handleCloseForm} 
            />
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
