import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Phone, Mail, MessageCircle, ChevronDown, ChevronRight, Eye, EyeOff, ChevronLeft, ChevronRight as ChevronRightIcon, Upload, Plus, Download, X, ArrowUpDown, ArrowUp, ArrowDown, Grid3X3, List, Table as TableIcon, User, WifiOff, RefreshCw } from "lucide-react";
import LeadFilters from "./lead-filters";
import LeadGrid from "./lead-grid";
import LeadList from "./lead-list";
import ExportDialog from "./export-dialog";
import ImportDialog from "./import-dialog";
import { InlineLoader } from "./ui/loader";
import { useToast } from "@/hooks/use-toast";
import { leadsService } from "@/lib/apis";
import type { LeadResponse, GetLeadsQuery } from "@/lib/apis";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { useLocation } from "wouter";

interface LeadTableProps {
  filters: {
    search: string;
    status: string | string[];
    category: string;
    city: string;
  };
  onFiltersChange?: (filters: { search: string; status: string | string[]; category: string; city: string; }) => void;
  onEditLead: (lead: LeadResponse) => void;
  userPreferences?: {
    defaultView: string;
    itemsPerPage: string;
    autoSave: boolean;
    compactMode: boolean;
    exportFormat: string;
    exportNotes: boolean;
  };
  onAddNewLead?: () => void;
  exportFilters?: {
    search: string;
    status: string | string[];
    category: string;
    city: string;
  };
}

export default function LeadTable({ filters, onFiltersChange, onEditLead, userPreferences, onAddNewLead, exportFilters }: LeadTableProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showInterestedColumn, setShowInterestedColumn] = useState(false);
  const [showNotesColumn, setShowNotesColumn] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [followupFilter, setFollowupFilter] = useState<'all' | 'overdue' | 'approaching' | 'future'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => 
    parseInt(userPreferences?.itemsPerPage || '20')
  );
  const [showNetworkError, setShowNetworkError] = useState(false);
  const [networkErrorMessage, setNetworkErrorMessage] = useState('');

  // Update items per page when user preferences change
  React.useEffect(() => {
    if (userPreferences?.itemsPerPage) {
      setItemsPerPage(parseInt(userPreferences.itemsPerPage));
    }
  }, [userPreferences?.itemsPerPage]);
  
  // View mode state - use user preference or default to table
  const [currentView, setCurrentView] = useState(() => 
    userPreferences?.defaultView || 'table'
  );

  // Update current view when user preferences change
  React.useEffect(() => {
    if (userPreferences?.defaultView) {
      setCurrentView(userPreferences.defaultView);
    }
  }, [userPreferences?.defaultView]);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: 'asc' | 'desc';
  }>({
    key: null,
    direction: 'asc'
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

  // Handler for page size change
  const handlePageSizeChange = (newSize: string) => {
    setItemsPerPage(parseInt(newSize));
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Handler for sorting
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Sort function
  const sortData = (data: LeadResponse[]) => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof LeadResponse];
      const bValue = b[sortConfig.key as keyof LeadResponse];

      // Handle null/undefined values
      if (!aValue && !bValue) return 0;
      if (!aValue) return 1;
      if (!bValue) return -1;

      // Convert to strings for comparison
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (sortConfig.direction === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  };

  // Get sort icon
  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="h-3 w-3 md:h-4 md:w-4 text-gray-900" /> : 
      <ArrowDown className="h-3 w-3 md:h-4 md:w-4 text-gray-900" />;
  };

  // Load leads from API
  const [leads, setLeads] = React.useState<LeadResponse[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [totalLeads, setTotalLeads] = React.useState(0);
  const isFetchingRef = React.useRef(false);
  const errorCountRef = React.useRef(0);
  const previousFiltersRef = React.useRef<string>('');
  const lastErrorTimeRef = React.useRef<number>(0);
  const cooldownPeriodRef = React.useRef<number>(30000); // 30 seconds cooldown
  const MAX_RETRIES = 3;
  const fetchTriggerRef = React.useRef(0); // Trigger refetch when this changes

  // Extract fetchLeads function so it can be called from multiple places
  const fetchLeads = React.useCallback(async () => {
    // Create a key from current filters to detect actual changes
    const filtersKey = JSON.stringify({ filters, currentPage, itemsPerPage, followupFilter });
    
    // Reset error count only when filters actually change
    if (previousFiltersRef.current !== filtersKey) {
      errorCountRef.current = 0;
      lastErrorTimeRef.current = 0;
      previousFiltersRef.current = filtersKey;
    }

    // Prevent concurrent calls
    if (isFetchingRef.current) {
      return;
    }

    // Check cooldown period
    const now = Date.now();
    if (errorCountRef.current >= MAX_RETRIES && (now - lastErrorTimeRef.current) < cooldownPeriodRef.current) {
      const remainingSeconds = Math.ceil((cooldownPeriodRef.current - (now - lastErrorTimeRef.current)) / 1000);
      console.error(`Too many errors, in cooldown period. Wait ${remainingSeconds} seconds.`);
      if (!showNetworkError) {
        setNetworkErrorMessage(`Server not found. Too many connection attempts. Please wait ${remainingSeconds} seconds before retrying or check your API URL configuration.`);
        setShowNetworkError(true);
        setIsLoading(false);
      }
      return;
    }

    // Circuit breaker: stop after max retries
    if (errorCountRef.current >= MAX_RETRIES) {
      console.error("Too many errors, stopping API calls");
      if (!showNetworkError) {
        setNetworkErrorMessage("Server not found. Please check your API URL configuration and try again later.");
        setShowNetworkError(true);
        setIsLoading(false);
      }
      return;
    }

    isFetchingRef.current = true;
    setIsLoading(true);
    try {
      // Map followupFilter to API format
      let followupDateFilter: 'overdue' | 'due_soon' | 'future' | undefined = undefined;
      if (followupFilter !== 'all') {
        // Map 'approaching' to 'due_soon' as per API spec
        followupDateFilter = followupFilter === 'approaching' ? 'due_soon' : followupFilter;
      }

      const query: GetLeadsQuery = {
        search: filters.search || undefined,
        status: filters.status && filters.status.length > 0 ? filters.status : undefined,
        category: filters.category || undefined,
        city: filters.city || undefined,
        page: currentPage,
        limit: itemsPerPage,
        followupDateFilter: followupDateFilter,
      };

      const response = await leadsService.getAllLeads(query);
      setLeads(response.data);
      setTotalLeads(response.meta.total);
      // Reset error count on success
      errorCountRef.current = 0;
      // Hide network error dialog if it was shown
      setShowNetworkError(false);
    } catch (error: any) {
      console.error("Error loading leads:", error);
      
      // Check if it's an authentication error (401 or 403)
      const isAuthError = error?.response?.status === 401 || error?.response?.status === 403;
      
      // Handle authentication errors with auto-logout
      if (isAuthError) {
        handleAutoLogout();
        return;
      }
      
      // Check if it's a network error (no response from server)
      const isNetworkError = !error?.response || 
                            error?.code === 'ECONNABORTED' || 
                            error?.code === 'ERR_NETWORK' || 
                            error?.code === 'ERR_INTERNET_DISCONNECTED' ||
                            error?.message?.includes('Network Error') || 
                            error?.message?.includes('timeout') ||
                            error?.message?.includes('Failed to fetch') ||
                            error?.message?.includes('Server not found');
      const isServerError = error?.response?.status >= 500;
      const isServerNotFound = error?.response?.status === 404 || 
                              error?.message?.includes('Server not found') ||
                              error?.message?.includes('Failed to fetch');
      
      // Increment error count for network/server errors
      if (isNetworkError || isServerError || isServerNotFound) {
        errorCountRef.current += 1;
        lastErrorTimeRef.current = Date.now();
      } else {
        // Reset on client errors (4xx) that aren't server issues
        errorCountRef.current = 0;
        lastErrorTimeRef.current = 0;
      }

      // Show network error dialog after 2 consecutive errors or immediately for server not found
      if (errorCountRef.current >= 2 || isServerNotFound) {
        let errorMsg = "Server not found. Please check your API URL configuration and try again.";
        
        if (isServerNotFound) {
          errorMsg = "Server not found. Please contact support if the problem persists.";
        } else if (isNetworkError) {
          errorMsg = "Unable to connect to the server. Please check your internet connection.";
        } else if (isServerError) {
          errorMsg = "Server is temporarily unavailable. Please try again later.";
        }
        
        setNetworkErrorMessage(errorMsg);
        setShowNetworkError(true);
        setLeads([]);
        setTotalLeads(0);
      } else {
        // Show toast for first error
        setLeads([]);
        setTotalLeads(0);
        toast({
          title: "Error",
          description: error?.response?.data?.message || error?.message || "Failed to load leads. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [filters, currentPage, itemsPerPage, followupFilter, showNetworkError]);

  // Fetch leads when filters or pagination change
  React.useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Listen for custom events when leads are added/updated/deleted
  React.useEffect(() => {
    const handleLeadChange = () => {
      // Small delay to ensure the mutation has completed
      setTimeout(() => {
        fetchLeads();
      }, 100);
    };

    // Listen for custom events
    window.addEventListener('leadAdded', handleLeadChange);
    window.addEventListener('leadUpdated', handleLeadChange);
    window.addEventListener('leadDeleted', handleLeadChange);
    window.addEventListener('leadsImported', handleLeadChange);

    return () => {
      window.removeEventListener('leadAdded', handleLeadChange);
      window.removeEventListener('leadUpdated', handleLeadChange);
      window.removeEventListener('leadDeleted', handleLeadChange);
      window.removeEventListener('leadsImported', handleLeadChange);
    };
  }, [fetchLeads]);

  // Helper functions for status colors and followup status
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
      case 'email': return <Mail className="h-3 w-3 md:h-4 md:w-4" />;
      case 'phone': return <Phone className="h-3 w-3 md:h-4 md:w-4" />;
      case 'whatsapp': return <MessageCircle className="h-3 w-3 md:h-4 md:w-4" />;
      case 'sms': return <MessageCircle className="h-3 w-3 md:h-4 md:w-4" />;
      case 'in-person': return <User className="h-3 w-3 md:h-4 md:w-4" />;
      case 'linkedin': return <MessageCircle className="h-3 w-3 md:h-4 md:w-4" />;
      default: return <Mail className="h-3 w-3 md:h-4 md:w-4" />;
    }
  };

  // Delete lead using API
  const deleteLead = async (id: string) => {
    try {
      await leadsService.deleteLead(id);
      
      // Update local state
      setLeads(prev => prev.filter(lead => lead.id !== id));
      setTotalLeads(prev => prev - 1);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('leadDeleted'));
      
      toast({
        title: "Success",
        description: "Lead deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting lead:", error);
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          "Failed to delete lead";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Sort leads (followup filtering is now handled by API)
  const sortedLeads = useMemo(() => {
    return sortData(leads);
  }, [leads, sortConfig]);

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

  // Handle delete lead
  const handleDeleteLead = (id: string) => {
    setDeletingId(id);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (deletingId) {
      await deleteLead(deletingId);
      setDeletingId(null);
    }
  };

  // Retry loading leads after network error
  const handleRetry = () => {
    errorCountRef.current = 0;
    lastErrorTimeRef.current = 0;
    setShowNetworkError(false);
    setIsLoading(true);
    
    // Map followupFilter to API format
    let followupDateFilter: 'overdue' | 'due_soon' | 'future' | undefined = undefined;
    if (followupFilter !== 'all') {
      // Map 'approaching' to 'due_soon' as per API spec
      followupDateFilter = followupFilter === 'approaching' ? 'due_soon' : followupFilter;
    }
    
    const query: GetLeadsQuery = {
      search: filters.search || undefined,
      status: filters.status && filters.status.length > 0 ? filters.status : undefined,
      category: filters.category || undefined,
      city: filters.city || undefined,
      page: currentPage,
      limit: itemsPerPage,
      followupDateFilter: followupDateFilter,
    };

    leadsService.getAllLeads(query)
      .then((response) => {
        setLeads(response.data);
        setTotalLeads(response.meta.total);
        errorCountRef.current = 0;
        setShowNetworkError(false);
      })
      .catch((error) => {
        console.error("Error retrying leads:", error);
        
        // Check if it's an authentication error
        const isAuthError = error?.response?.status === 401 || error?.response?.status === 403;
        if (isAuthError) {
          handleAutoLogout();
          return;
        }
        
        const isNetworkError = !error?.response || error?.code === 'ECONNABORTED' || error?.code === 'ERR_NETWORK' || error?.message?.includes('Network Error') || error?.message?.includes('timeout');
        
        if (isNetworkError) {
          setNetworkErrorMessage("Still unable to connect. Please check your internet connection.");
        } else {
          setNetworkErrorMessage("Server is still unavailable. Please try again later.");
        }
        setShowNetworkError(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 md:p-6">
          <InlineLoader text="Loading leads..." />
        </CardContent>
      </Card>
    );
  }

  // Pagination logic (pagination is handled by API)
  const totalPages = Math.ceil(totalLeads / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLeads = sortedLeads;

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 md:py-4 border-b border-gray-200">
        {/* Desktop-Optimized Header */}
        <div className="space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
          {/* Title - Made Bold */}
          <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">Leads View</CardTitle>
          
          {/* Action Buttons - Smaller Size on Right Side */}
          <div className="flex gap-2 sm:gap-3">
            <ImportDialog onImportSuccess={() => {
              console.log("ImportDialog onImportSuccess called - refetching leads");
              // Refetch leads data
              // Map followupFilter to API format
              let followupDateFilter: 'overdue' | 'due_soon' | 'future' | undefined = undefined;
              if (followupFilter !== 'all') {
                // Map 'approaching' to 'due_soon' as per API spec
                followupDateFilter = followupFilter === 'approaching' ? 'due_soon' : followupFilter;
              }
              
              const query: GetLeadsQuery = {
                search: filters.search || undefined,
                status: filters.status && filters.status.length > 0 ? filters.status : undefined,
                category: filters.category || undefined,
                city: filters.city || undefined,
                page: currentPage,
                limit: itemsPerPage,
                followupDateFilter: followupDateFilter,
              };
              
              leadsService.getAllLeads(query)
                .then((response) => {
                  setLeads(response.data);
                  setTotalLeads(response.meta.total);
                })
                .catch((error) => {
                  console.error("Error refetching leads:", error);
                });
              
              // Invalidate queries
              queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
              queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
            }} />
            {exportFilters && <ExportDialog currentFilters={exportFilters} />}
            {onAddNewLead && (
              <Button 
                className="btn-impressive-primary text-xs sm:text-sm whitespace-nowrap flex-shrink-0 px-2 py-2 sm:px-3 sm:py-2"
                onClick={onAddNewLead}
                data-testid="button-add-lead"
              >
                <Plus className="mr-1 h-3 w-3 sm:h-4 sm:w-4 icon" />
                <span>Add Lead</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filters Row */}
        {onFiltersChange && (
          <div className="mt-4 sm:mt-6">
            <LeadFilters filters={filters} onFiltersChange={onFiltersChange} />
          </div>
        )}

        {/* Mobile-Optimized Controls Row */}
        <div className="mt-4 sm:mt-6 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
          {/* Legend - Mobile Compact with Filters */}
          <div className="space-y-3">
            <div className="text-sm sm:text-base font-medium text-gray-700">Next Followup Date</div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
              <button
                onClick={() => setFollowupFilter('all')}
                className={`flex items-center space-x-2 px-2 py-1 rounded-md transition-all cursor-pointer ${
                  followupFilter === 'all' 
                    ? 'bg-gray-200 ring-2 ring-gray-400 shadow-md' 
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="w-4 h-4 sm:w-5 sm:h-5 bg-gray-300 border-l-4 border-gray-600 rounded-sm shadow-sm"></div>
                <span className="text-gray-800 font-medium">All</span>
              </button>
              <button
                onClick={() => setFollowupFilter('overdue')}
                className={`flex items-center space-x-2 px-2 py-1 rounded-md transition-all cursor-pointer ${
                  followupFilter === 'overdue' 
                    ? 'bg-red-50 ring-2 ring-red-400 shadow-md' 
                    : 'hover:bg-red-50'
                }`}
              >
                <div className="w-4 h-4 sm:w-5 sm:h-5 bg-red-100 border-l-4 border-red-500 rounded-sm shadow-sm"></div>
                <span className="text-red-800 font-medium">Overdue</span>
              </button>
              <button
                onClick={() => setFollowupFilter('approaching')}
                className={`flex items-center space-x-2 px-2 py-1 rounded-md transition-all cursor-pointer ${
                  followupFilter === 'approaching' 
                    ? 'bg-yellow-50 ring-2 ring-yellow-400 shadow-md' 
                    : 'hover:bg-yellow-50'
                }`}
              >
                <div className="w-4 h-4 sm:w-5 sm:h-5 bg-yellow-100 border-l-4 border-yellow-500 rounded-sm shadow-sm"></div>
                <span className="text-yellow-800 font-medium">Due Soon</span>
              </button>
              <button
                onClick={() => setFollowupFilter('future')}
                className={`flex items-center space-x-2 px-2 py-1 rounded-md transition-all cursor-pointer ${
                  followupFilter === 'future' 
                    ? 'bg-green-50 ring-2 ring-green-400 shadow-md' 
                    : 'hover:bg-green-50'
                }`}
              >
                <div className="w-4 h-4 sm:w-5 sm:h-5 bg-green-100 border-l-4 border-green-500 rounded-sm shadow-sm"></div>
                <span className="text-green-800 font-medium">Future</span>
              </button>
            </div>
          </div>
          
          {/* View Controls - Mobile Optimized */}
          <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
            {/* View Mode Toggle */}
            <div className="flex items-center justify-center sm:justify-start border border-gray-200 rounded-lg p-1 bg-gray-50">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={currentView === 'table' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setCurrentView('table')}
                      className="h-8 sm:h-9 px-3 sm:px-4 rounded-md"
                    >
                      <TableIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Table View</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={currentView === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setCurrentView('grid')}
                      className="h-8 sm:h-9 px-3 sm:px-4 rounded-md"
                    >
                      <Grid3X3 className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Grid View</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={currentView === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setCurrentView('list')}
                      className="h-8 sm:h-9 px-3 sm:px-4 rounded-md"
                    >
                      <List className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>List View</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Column Toggles - Only show for table view */}
            {currentView === 'table' && (
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInterestedColumn(!showInterestedColumn)}
                  data-testid="toggle-interested-column"
                  className="h-8 sm:h-9 px-3 sm:px-4 text-sm rounded-lg border-gray-300"
                >
                  {showInterestedColumn ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                  <span>Interest</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNotesColumn(!showNotesColumn)}
                  data-testid="toggle-notes-column"
                  className="h-8 sm:h-9 px-3 sm:px-4 text-sm rounded-lg border-gray-300"
                >
                  {showNotesColumn ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                  <span>Notes</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Conditional View Rendering */}
        {currentView === 'table' && (
          <div className="w-full overflow-x-auto">
            <Table className={`w-full ${(!showInterestedColumn && !showNotesColumn) ? '' : 'min-w-max'}`}>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider w-16 text-center sm:hidden">
                    Actions
                  </TableHead>
                  <TableHead className="hidden text-xs font-medium text-gray-500 uppercase tracking-wider w-12 md:w-16 text-center sm:table-cell">
                    Expand
                  </TableHead>
                  <TableHead 
                    className={`text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none ${
                      !showInterestedColumn && !showNotesColumn ? 'w-32 md:w-48' : 'w-28 md:w-40'
                    }`}
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center justify-between">
                      <span>Lead</span>
                      {getSortIcon('name')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className={`text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none ${
                      !showInterestedColumn && !showNotesColumn ? 'w-24 md:w-32' : 'w-20 md:w-28'
                    }`}
                    onClick={() => handleSort('nextFollowupDate')}
                  >
                    <div className="flex items-center justify-between">
                      <span className="hidden sm:inline">Next Followup Date</span>
                      <span className="sm:hidden">Next Followup</span>
                      {getSortIcon('nextFollowupDate')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className={`text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none ${
                      !showInterestedColumn && !showNotesColumn ? 'w-28 md:w-40' : 'w-24 md:w-32'
                    }`}
                    onClick={() => handleSort('phoneNumber')}
                  >
                    <div className="flex items-center justify-between">
                      <span>Contact</span>
                      {getSortIcon('phoneNumber')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className={`text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none ${
                      !showInterestedColumn && !showNotesColumn ? 'w-28 md:w-40' : 'w-24 md:w-32'
                    }`}
                    onClick={() => handleSort('companyName')}
                  >
                    <div className="flex items-center justify-between">
                      <span>Company</span>
                      {getSortIcon('companyName')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className={`text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none ${
                      !showInterestedColumn && !showNotesColumn ? 'w-20 md:w-24' : 'w-16 md:w-20'
                    }`}
                    onClick={() => handleSort('leadStatus')}
                  >
                    <div className="flex items-center justify-between">
                      <span>Status</span>
                      {getSortIcon('leadStatus')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className={`text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none ${
                      !showInterestedColumn && !showNotesColumn ? 'w-24 md:w-32' : 'w-20 md:w-28'
                    }`}
                    onClick={() => handleSort('lastContactedDate')}
                  >
                    <div className="flex items-center justify-between">
                      <span className="hidden sm:inline">Last Contacted Date</span>
                      <span className="sm:hidden">Last Contact</span>
                      {getSortIcon('lastContactedDate')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className={`text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none ${
                      !showInterestedColumn && !showNotesColumn ? 'w-24 md:w-32' : 'w-20 md:w-28'
                    }`}
                    onClick={() => handleSort('lastContactedBy')}
                  >
                    <div className="flex items-center justify-between">
                      <span className="hidden sm:inline">Last Contacted By</span>
                      <span className="sm:hidden">Contacted By</span>
                      {getSortIcon('lastContactedBy')}
                    </div>
                  </TableHead>
                  {showInterestedColumn && (
                    <TableHead 
                      className="text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('customerInterestedIn')}
                    >
                      <div className="flex items-center justify-between">
                        <span className="hidden sm:inline">Customer Interested In</span>
                        <span className="sm:hidden">Interested In</span>
                        {getSortIcon('customerInterestedIn')}
                      </div>
                    </TableHead>
                  )}
                  <TableHead 
                    className={`text-xs font-medium text-gray-500 uppercase tracking-wider text-center cursor-pointer hover:bg-gray-100 select-none ${
                      !showInterestedColumn && !showNotesColumn ? 'w-12 md:w-16' : 'w-10 md:w-12'
                    }`}
                    onClick={() => handleSort('preferredCommunicationChannel')}
                  >
                    <div className="flex items-center justify-between">
                      <span>Channel</span>
                      {getSortIcon('preferredCommunicationChannel')}
                    </div>
                  </TableHead>
                  {showNotesColumn && (
                    <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">Additional Notes</TableHead>
                  )}
                  <TableHead className="hidden text-xs font-medium text-gray-500 uppercase tracking-wider w-16 md:w-20 sm:table-cell">
                    Actions
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider w-12 text-center sm:hidden">
                    Expand
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={showInterestedColumn && showNotesColumn ? 12 : showInterestedColumn || showNotesColumn ? 11 : 10} className="text-center py-6 md:py-8">
                      <div className="text-gray-500">
                        <p className="text-base md:text-lg font-medium">No leads found</p>
                        <p className="text-xs md:text-sm">Try adjusting your filters or add a new lead.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLeads.map((lead) => (
                    <React.Fragment key={lead.id}>
                      <TableRow className="hover:bg-gray-50">
                        <TableCell className="w-16 text-center sm:hidden">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 md:h-8 md:w-8 p-0"
                            onClick={() => onEditLead(lead)}
                          >
                            <Edit className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                        </TableCell>
                        <TableCell className="hidden w-12 text-center sm:table-cell md:w-16">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRowExpansion(lead.id)}
                            className="h-5 w-5 md:h-6 md:w-6 p-0"
                          >
                            {expandedRows.has(lead.id) ? (
                              <ChevronDown className="h-3 w-3 md:h-4 md:w-4" />
                            ) : (
                              <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-semibold text-gray-900 text-sm md:text-base">{lead.name}</div>
                            <div className="text-xs md:text-sm text-gray-500">
                              {lead.customerCategory === 'existing' ? 'Existing Customer' : 'Potential Customer'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`px-2 md:px-3 py-1 rounded-md text-xs md:text-sm font-medium ${getFollowupStatus(lead.nextFollowupDate ?? null).bgClassName}`}>
                            {lead.nextFollowupDate ? format(new Date(lead.nextFollowupDate), 'MMM dd, yyyy') : 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs md:text-sm text-gray-900">{lead.phoneNumber}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900 text-xs md:text-sm">{lead.companyName || 'N/A'}</div>
                            <div className="text-xs text-gray-500">{lead.designation || 'N/A'}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(lead.leadStatus ?? '')} text-xs`}>
                            {(lead.leadStatus ?? '').replace(/([A-Z])/g, ' $1').trim()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs md:text-sm text-gray-900">
                          {lead.lastContactedDate ? format(new Date(lead.lastContactedDate), 'MMM dd, yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell className="text-xs md:text-sm text-gray-900">{lead.lastContactedBy || 'N/A'}</TableCell>
                        {showInterestedColumn && (
                          <TableCell className="text-xs md:text-sm text-gray-900 max-w-xs truncate">
                            {lead.customerInterestedIn || 'N/A'}
                          </TableCell>
                        )}
                        <TableCell className="text-center">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex justify-center">
                                  {getCommunicationIcon(lead.preferredCommunicationChannel ?? null)}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Preferred: {lead.preferredCommunicationChannel || 'Not specified'}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        {showNotesColumn && (
                          <TableCell className="text-xs md:text-sm text-gray-900 max-w-xs truncate">
                            {lead.additionalNotes || 'N/A'}
                          </TableCell>
                        )}
                        <TableCell className="hidden sm:table-cell">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 md:h-8 md:w-8 p-0"
                            onClick={() => onEditLead(lead)}
                          >
                            <Edit className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                        </TableCell>
                        <TableCell className="w-12 text-center sm:hidden">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRowExpansion(lead.id)}
                            className="h-5 w-5 md:h-6 md:w-6 p-0"
                          >
                            {expandedRows.has(lead.id) ? (
                              <ChevronDown className="h-3 w-3 md:h-4 md:w-4" />
                            ) : (
                              <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(lead.id) && (
                        <TableRow>
                          <TableCell colSpan={showInterestedColumn && showNotesColumn ? 12 : showInterestedColumn || showNotesColumn ? 11 : 10}>
                            <div className="bg-gray-50 p-3 md:p-4 rounded-md">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                <div>
                                  <p className="font-medium text-gray-800 mb-1 text-sm">Contact Information:</p>
                                  <p className="pl-2 text-gray-600 text-xs md:text-sm">Phone: {lead.phoneNumber}</p>
                                  {lead.email && <p className="pl-2 text-gray-600 text-xs md:text-sm">Email: {lead.email}</p>}
                                  {lead.dateOfBirth && <p className="pl-2 text-gray-600 text-xs md:text-sm">Date of Birth: {format(new Date(lead.dateOfBirth), 'MMM dd, yyyy')}</p>}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-800 mb-1 text-sm">Location:</p>
                                  {lead.city && <p className="pl-2 text-gray-600 text-xs md:text-sm">City: {lead.city}</p>}
                                  {lead.state && <p className="pl-2 text-gray-600 text-xs md:text-sm">State: {lead.state}</p>}
                                  {lead.country && <p className="pl-2 text-gray-600 text-xs md:text-sm">Country: {lead.country}</p>}
                                  {lead.pincode && <p className="pl-2 text-gray-600 text-xs md:text-sm">Pincode: {lead.pincode}</p>}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-800 mb-1 text-sm">Company Details:</p>
                                  {lead.companyName && <p className="pl-2 text-gray-600 text-xs md:text-sm">Company: {lead.companyName}</p>}
                                  {lead.designation && <p className="pl-2 text-gray-600 text-xs md:text-sm">Designation: {lead.designation}</p>}
                                  <p className="pl-2 text-gray-600 text-xs md:text-sm">Category: {lead.customerCategory === 'existing' ? 'Existing Customer' : 'Potential Customer'}</p>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-800 mb-1 text-sm">Lead Information:</p>
                                  <p className="pl-2 text-gray-600 text-xs md:text-sm">Source: {lead.leadSource}</p>
                                  {lead.customLeadSource && <p className="pl-2 text-gray-600 text-xs md:text-sm">Custom Source: {lead.customLeadSource}</p>}
                                  {lead.leadCreatedBy && <p className="pl-2 text-gray-600 text-xs md:text-sm">Created By: {lead.leadCreatedBy}</p>}
                                </div>
                                {showInterestedColumn && (
                                  <div>
                                    <p className="font-medium text-gray-800 mb-1 text-sm">Interested In:</p>
                                    <p className="pl-2 text-gray-600 text-xs md:text-sm">{lead.customerInterestedIn || "Not specified"}</p>
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-gray-800 mb-1 text-sm">Additional Notes:</p>
                                  <p className="pl-2 italic text-gray-600 text-xs md:text-sm">{lead.additionalNotes || "No additional notes"}</p>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Grid View */}
        {currentView === 'grid' && (
          <div className="p-3 md:p-6">
            {paginatedLeads.length === 0 ? (
              <div className="text-center py-6 md:py-8">
                <div className="text-gray-500">
                  <p className="text-base md:text-lg font-medium">No leads found</p>
                  <p className="text-xs md:text-sm">Try adjusting your filters or add a new lead.</p>
                </div>
              </div>
            ) : (
              <LeadGrid 
                leads={paginatedLeads} 
                onEditLead={onEditLead}
                onDeleteLead={handleDeleteLead}
                compactMode={userPreferences?.compactMode || false}
              />
            )}
          </div>
        )}

        {/* List View */}
        {currentView === 'list' && (
          <div className="p-3 md:p-6">
            {paginatedLeads.length === 0 ? (
              <div className="text-center py-6 md:py-8">
                <div className="text-gray-500">
                  <p className="text-base md:text-lg font-medium">No leads found</p>
                  <p className="text-xs md:text-sm">Try adjusting your filters or add a new lead.</p>
                </div>
              </div>
            ) : (
              <LeadList 
                leads={paginatedLeads} 
                onEditLead={onEditLead}
                onDeleteLead={handleDeleteLead}
                compactMode={userPreferences?.compactMode || false}
                onLeadClick={onEditLead}
              />
            )}
          </div>
        )}
        
        {/* Pagination Controls */}
        {totalLeads > 0 && (
          <div className="flex flex-col space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0 px-3 md:px-6 py-3 md:py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-2 md:flex-row md:items-center md:space-y-0 md:space-x-4">
              <div className="text-xs md:text-sm text-gray-700">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, totalLeads)} of {totalLeads} leads
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs md:text-sm text-gray-600">Show:</span>
                <Select value={itemsPerPage.toString()} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="w-16 md:w-20 h-7 md:h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs md:text-sm text-gray-600">per page</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                data-testid="button-prev-page"
                className="h-7 md:h-8 text-xs"
              >
                <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </Button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      data-testid={`button-page-${pageNum}`}
                      className="w-6 h-7 md:w-8 md:h-8 p-0 text-xs"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                data-testid="button-next-page"
                className="h-7 md:h-8 text-xs"
              >
                <span className="hidden sm:inline">Next</span>
                <span className="sm:hidden">Next</span>
                <ChevronRightIcon className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the lead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Network Error Dialog */}
      <AlertDialog open={showNetworkError} onOpenChange={setShowNetworkError}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <WifiOff className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-xl">Connection Issue</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base">
              {networkErrorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleRetry}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Connection
            </Button>
            <AlertDialogCancel className="w-full sm:w-auto mt-0">
              Dismiss
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
