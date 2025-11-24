import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, Phone , Mail, MessageCircle, Building, User, Calendar, MapPin, ChevronRight, ChevronDown, PhoneCall } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { LeadResponse } from "@/lib/apis";
import { format } from "date-fns";

interface LeadListProps {
  leads: LeadResponse[];
  onEditLead: (lead: LeadResponse) => void;
  onDeleteLead: (id: string) => void;
  compactMode?: boolean;
  onLeadClick?: (lead: LeadResponse) => void; // Add click handler for the arrow
}

export default function LeadList({ leads, onEditLead, onDeleteLead, compactMode = false, onLeadClick }: LeadListProps) {
  const { toast } = useToast();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'followup': return 'bg-yellow-100 text-yellow-800';
      case 'qualified': return 'bg-purple-100 text-purple-800';
      case 'hot': return 'bg-red-100 text-red-800';
      case 'converted': return 'bg-green-100 text-green-800';
      case 'lost': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFollowupStatus = (followupDate: string | null) => {
    if (!followupDate) return { status: 'none', className: '', bgClassName: '' };
    
    try {
      const today = new Date();
      const followup = new Date(followupDate);
      const diffInDays = Math.ceil((followup.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffInDays < 0) {
        return { 
          status: 'overdue', 
          className: 'text-red-800 font-medium', 
          bgClassName: 'bg-red-100 border-l-4 border-red-500' 
        };
      } else if (diffInDays <= 7) {
        return { 
          status: 'approaching', 
          className: 'text-yellow-800 font-medium', 
          bgClassName: 'bg-yellow-100 border-l-4 border-yellow-500' 
        };
      } else {
        return { 
          status: 'future', 
          className: 'text-green-800 font-medium', 
          bgClassName: 'bg-green-100 border-l-4 border-green-500' 
        };
      }
    } catch {
      return { status: 'none', className: '', bgClassName: '' };
    }
  };



  
  // Toggle row expansion
  const toggleRowExpansion = (leadId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  };

  const handleLeadClick = (lead: LeadResponse) => {
    if (onLeadClick) {
      onLeadClick(lead);
    } else {
      // Default behavior - toggle expansion
      toggleRowExpansion(lead.id);
    }
  };

  return (
    <div className="space-y-3">
      {leads.map((lead) => {
        const followupStatus = getFollowupStatus(lead.nextFollowupDate);
        const isExpanded = expandedRows.has(lead.id);
        
        return (
          <div key={lead.id}>
            {/* Main Lead Card */}
            <div 
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 cursor-pointer"
              onClick={() => toggleRowExpansion(lead.id)}
            >
              {/* Main Content */}
              <div className="flex-1 min-w-0">
                {/* Top Row - Name, Badges, and Communication Channel */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {/* Lead Name and Badges */}
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <h3 className={`font-semibold text-gray-900 truncate ${compactMode ? 'text-sm' : 'text-base'}`}>
                        {lead.name}
                      </h3>
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {lead.customerCategory === 'existing' ? 'Existing' : 'Potential'}
                      </Badge>
                      <Badge className={`${getStatusColor(lead.leadStatus || 'new')} text-xs whitespace-nowrap`}>
                        {(lead.leadStatus || 'new').replace(/([A-Z])/g, ' $1').trim()}
                      </Badge>
                    </div>
                  </div>
                  

                </div>
                
                {/* Contact Info Row */}
                <div className="flex items-center space-x-4 mb-2">
                  <div className="flex items-center text-sm text-gray-600 min-w-0">
                    <Phone className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{lead.phoneNumber}</span>
                  </div>
                  
                  {lead.email && (
                    <div className="flex items-center text-sm text-gray-600 min-w-0">
                      <Mail className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{lead.email}</span>
                    </div>
                  )}
                  
                  {lead.companyName && (
                    <div className="flex items-center text-sm text-gray-600 min-w-0">
                      <Building className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{lead.companyName}</span>
                    </div>
                  )}
                </div>
                
                {/* Location and Dates Row */}
                <div className="flex items-center space-x-4">
                  {/* Location */}
                  {(lead.city || lead.state) && (
                    <div className="flex items-center text-xs text-gray-500 min-w-0">
                      <MapPin className="mr-1.5 h-3 w-3 flex-shrink-0" />
                      <span className="truncate">
                        {[lead.city, lead.state].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  
                  {/* Follow-up Date */}
                  {lead.nextFollowupDate && (
                    <div className={`flex items-center text-xs ${followupStatus.className} min-w-0`}>
                      <Calendar className="mr-1.5 h-3 w-3 flex-shrink-0" />
                      <span className="truncate">
                        Follow-up: {format(new Date(lead.nextFollowupDate), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  )}
                  
                  {/* Last Contacted */}
                  {lead.lastContactedDate && (
                    <div className="flex items-center text-xs text-gray-500 min-w-0">
                      <span className="truncate">
                        Last: {format(new Date(lead.lastContactedDate), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Actions - Only More Options and Expand/Collapse Arrow */}
              <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                {/* More Options */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditLead(lead);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                
                {/* Expand/Collapse Arrow */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRowExpansion(lead.id);
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="bg-gray-50 p-4 rounded-md mt-2 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium text-gray-800 mb-1">Contact Information:</p>
                    <p className="pl-2 text-gray-600">Phone: {lead.phoneNumber}</p>
                    {lead.email && <p className="pl-2 text-gray-600">Email: {lead.email}</p>}
                    {lead.dateOfBirth && <p className="pl-2 text-gray-600">Date of Birth: {format(new Date(lead.dateOfBirth), 'MMM dd, yyyy')}</p>}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 mb-1">Location:</p>
                    {lead.city && <p className="pl-2 text-gray-600">City: {lead.city}</p>}
                    {lead.state && <p className="pl-2 text-gray-600">State: {lead.state}</p>}
                    {lead.country && <p className="pl-2 text-gray-600">Country: {lead.country}</p>}
                    {lead.pincode && <p className="pl-2 text-gray-600">Pincode: {lead.pincode}</p>}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 mb-1">Company Details:</p>
                    {lead.companyName && <p className="pl-2 text-gray-600">Company: {lead.companyName}</p>}
                    {lead.designation && <p className="pl-2 text-gray-600">Designation: {lead.designation}</p>}
                    <p className="pl-2 text-gray-600">Category: {lead.customerCategory === 'existing' ? 'Existing Customer' : 'Potential Customer'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 mb-1">Lead Information:</p>
                    <p className="pl-2 text-gray-600">Source: {lead.leadSource}</p>
                    {lead.customLeadSource && <p className="pl-2 text-gray-600">Custom Source: {lead.customLeadSource}</p>}
                    {lead.leadCreatedBy && <p className="pl-2 text-gray-600">Created By: {lead.leadCreatedBy}</p>}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 mb-1">Interested In:</p>
                    <p className="pl-2 text-gray-600">{lead.customerInterestedIn || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 mb-1">Additional Notes:</p>
                    <p className="pl-2 italic text-gray-600">{lead.additionalNotes || "No additional notes"}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
} 