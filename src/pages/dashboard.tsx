import { useState } from "react";
import AppLayout from "@/components/app-layout";
import LeadTable from "@/components/lead-table";
import LeadForm from "@/components/lead-form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { LeadResponse } from "@/lib/apis";
import type { Lead } from "../../shared/schema";

export default function Dashboard() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  
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
      createdAt: leadResponse.createdAt ? new Date(leadResponse.createdAt) : new Date(),
    };
  };
  const [filters, setFilters] = useState({
    search: "",
    status: [] as string[],
    category: "",
    city: "",
  });

  // Default user preferences (no API call)
  const userPreferences = {
    defaultView: 'table',
    itemsPerPage: '10',
    autoSave: true,
    compactMode: false,
    exportFormat: 'csv',
    exportNotes: true
  };



  const handleEditLead = (lead: LeadResponse) => {
    setEditingLead(convertLeadResponseToLead(lead));
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingLead(null);
  };

  const handleFiltersChange = (newFilters: { search: string; status: string | string[]; category: string; city: string; }) => {
    const normalizedStatus = Array.isArray(newFilters.status) ? newFilters.status : newFilters.status ? [newFilters.status] : [];
    
    // Only update if there's an actual change
    if (
      filters.search !== newFilters.search ||
      JSON.stringify(filters.status) !== JSON.stringify(normalizedStatus) ||
      filters.category !== newFilters.category ||
      filters.city !== newFilters.city
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
