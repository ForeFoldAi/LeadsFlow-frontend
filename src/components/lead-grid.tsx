import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, Phone, Mail, Trash2, MessageCircle, Building, User, Calendar, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { LeadResponse } from "@/lib/apis";
import { format } from "date-fns";

interface LeadGridProps {
  leads: LeadResponse[];
  onEditLead: (lead: LeadResponse) => void;
  onDeleteLead: (id: string) => void;
  compactMode?: boolean;
}

export default function LeadGrid({ leads, onEditLead, onDeleteLead, compactMode = false }: LeadGridProps) {
  const { toast } = useToast();

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

  const getCommunicationIcon = (channel: string | null) => {
    switch (channel) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'whatsapp': return <MessageCircle className="h-4 w-4" />;
      case 'sms': return <MessageCircle className="h-4 w-4" />;
      case 'in-person': return <User className="h-4 w-4" />;
      case 'linkedin': return <MessageCircle className="h-4 w-4" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  return (
    <div className={`grid gap-4 ${compactMode ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
      {leads.map((lead) => {
        const followupStatus = getFollowupStatus(lead.nextFollowupDate);
        
        return (
          <Card key={lead.id} className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className={`pb-3 ${compactMode ? 'px-4 py-3' : 'px-6 py-4'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-gray-900 truncate ${compactMode ? 'text-sm' : 'text-base'}`}>
                    {lead.name}
                  </h3>
                  <p className={`text-gray-500 ${compactMode ? 'text-xs' : 'text-sm'}`}>
                    {lead.customerCategory === 'existing' ? 'Existing Customer' : 'Potential Customer'}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => onEditLead(lead)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center justify-between mt-2">
                <Badge className={getStatusColor(lead.leadStatus || 'new')}>
                  {(lead.leadStatus || 'new').replace(/([A-Z])/g, ' $1').trim()}
                </Badge>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center text-gray-500">
                        {getCommunicationIcon(lead.preferredCommunicationChannel)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Preferred: {lead.preferredCommunicationChannel || 'Not specified'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            
            <CardContent className={`pt-0 ${compactMode ? 'px-4 pb-3' : 'px-6 pb-4'}`}>
              <div className="space-y-2">
                {/* Contact Info */}
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="mr-2 h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{lead.phoneNumber}</span>
                </div>
                
                {lead.email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="mr-2 h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{lead.email}</span>
                  </div>
                )}
                
                {/* Company Info */}
                {lead.companyName && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Building className="mr-2 h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{lead.companyName}</span>
                  </div>
                )}
                
                {/* Location */}
                {(lead.city || lead.state) && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="mr-2 h-3 w-3 flex-shrink-0" />
                    <span className="truncate">
                      {[lead.city, lead.state].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
                
                {/* Follow-up Date */}
                {lead.nextFollowupDate && (
                  <div className={`flex items-center text-sm ${followupStatus.className}`}>
                    <Calendar className="mr-2 h-3 w-3 flex-shrink-0" />
                    <span className="truncate">
                      {format(new Date(lead.nextFollowupDate), 'MMM dd, yyyy')}
                    </span>
                  </div>
                )}
                
                {/* Last Contacted */}
                {lead.lastContactedDate && (
                  <div className="flex items-center text-xs text-gray-500">
                    <span className="truncate">
                      Last contacted: {format(new Date(lead.lastContactedDate), 'MMM dd, yyyy')}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
} 