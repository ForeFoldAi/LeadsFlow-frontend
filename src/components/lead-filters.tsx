import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronDown, X } from "lucide-react";
import React from "react";

interface LeadFiltersProps {
  filters: {
    search: string;
    status: string | string[];
    category: string;
    city: string;
  };
  onFiltersChange: (filters: any) => void;
}

const statusOptions = [
  { value: "new", label: "New Lead", color: "bg-blue-100 text-blue-800" },
  { value: "followup", label: "Follow-up", color: "bg-yellow-100 text-yellow-800" },
  { value: "qualified", label: "Qualified", color: "bg-purple-100 text-purple-800" },
  { value: "hot", label: "Hot Lead", color: "bg-orange-100 text-orange-800" },
  { value: "converted", label: "Converted to Customer", color: "bg-green-100 text-green-800" },
  { value: "lost", label: "Lost", color: "bg-red-100 text-red-800" },
];

export default function LeadFilters({ filters, onFiltersChange }: LeadFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    Array.isArray(filters.status) ? filters.status : filters.status ? [filters.status] : []
  );
  const [isStatusPopoverOpen, setIsStatusPopoverOpen] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef(false);

  // Fetch cities from user leads
  // Get cities from localStorage (no API call)
  const [cities, setCities] = React.useState<string[]>([]);
  
  React.useEffect(() => {
    try {
      const storedLeads = localStorage.getItem("leads");
      if (storedLeads) {
        const leads: any[] = JSON.parse(storedLeads);
        const uniqueCities = Array.from(new Set(leads.map(lead => lead.city).filter(Boolean))) as string[];
        setCities(uniqueCities.sort());
      }
    } catch (error) {
      console.error("Error loading cities:", error);
      setCities([]);
    }
  }, []);

  // Only update search value when filters change externally (not from our debounced updates)
  useEffect(() => {
    if (!isUpdatingRef.current && filters.search !== searchValue) {
      setSearchValue(filters.search);
    }
  }, [filters.search]);

  // Update selected statuses when filters change
  useEffect(() => {
    const newSelectedStatuses = Array.isArray(filters.status) 
      ? filters.status 
      : filters.status ? [filters.status] : [];
    setSelectedStatuses(newSelectedStatuses);
  }, [filters.status]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Stable search handler - no re-renders
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchValue(newValue); // Update UI immediately
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounced filter update
    searchTimeoutRef.current = setTimeout(() => {
      isUpdatingRef.current = true;
      onFiltersChange({ ...filters, search: newValue });
      // Reset flag after a short delay to allow the effect to process
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 100);
    }, 800); // Increased debounce time for better stability
  };

  // Immediate search on Enter
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      isUpdatingRef.current = true;
      onFiltersChange({ ...filters, search: searchValue });
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 100);
    }
  };

  const updateFilter = (key: string, value: string) => {
    const newValue = value === "all" ? "" : value;
    onFiltersChange({ ...filters, [key]: newValue });
  };

  const handleStatusChange = (status: string, checked: boolean) => {
    let newStatuses: string[];
    
    if (checked) {
      newStatuses = [...selectedStatuses, status];
    } else {
      newStatuses = selectedStatuses.filter(s => s !== status);
    }
    
    setSelectedStatuses(newStatuses);
    onFiltersChange({ ...filters, status: newStatuses });
  };

  const clearAllStatuses = () => {
    setSelectedStatuses([]);
    onFiltersChange({ ...filters, status: [] });
  };

  const selectAllStatuses = () => {
    const allStatuses = statusOptions.map(option => option.value);
    setSelectedStatuses(allStatuses);
    onFiltersChange({ ...filters, status: allStatuses });
  };

  const getStatusDisplayText = () => {
    if (selectedStatuses.length === 0) return "All Status";
    if (selectedStatuses.length === 1) {
      const status = statusOptions.find(s => s.value === selectedStatuses[0]);
      return status?.label || "All Status";
    }
    return `${selectedStatuses.length} Status${selectedStatuses.length > 1 ? 'es' : ''}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
      {/* Search Bar and Filters - Side by Side Layout */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search Bar */}
        <div className="flex-1 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            <Input
              type="text"
              placeholder="Search leads by name, email, company..."
              value={searchValue}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              className="pl-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              data-testid="input-search"
              autoComplete="off"
              spellCheck="false"
              autoCorrect="off"
              autoCapitalize="off"
            />
          </div>
        </div>

        {/* Filters - Horizontal Layout */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 lg:flex-shrink-0">
          {/* Multi-select Status Filter with Checkboxes */}
          <Popover open={isStatusPopoverOpen} onOpenChange={setIsStatusPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="justify-between text-left font-normal h-10 text-xs sm:text-sm w-full sm:w-auto sm:min-w-[140px]"
                data-testid="status-filter-trigger"
              >
                <span className="truncate">{getStatusDisplayText()}</span>
                <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">Filter by Status</h4>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={selectAllStatuses}
                      className="text-xs"
                    >
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllStatuses}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
                
                {/* Selected Status Badges */}
                {selectedStatuses.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedStatuses.map((status) => {
                      const statusOption = statusOptions.find(s => s.value === status);
                      return (
                        <Badge
                          key={status}
                          variant="secondary"
                          className={`${statusOption?.color} flex items-center gap-1`}
                        >
                          {statusOption?.label}
                          <button
                            onClick={() => handleStatusChange(status, false)}
                            className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div className="p-4 max-h-60 overflow-y-auto">
                <div className="space-y-3">
                  {statusOptions.map((status) => (
                    <div key={status.value} className="flex items-center space-x-3">
                      <Checkbox
                        id={`status-${status.value}`}
                        checked={selectedStatuses.includes(status.value)}
                        onCheckedChange={(checked) => handleStatusChange(status.value, checked as boolean)}
                        data-testid={`checkbox-status-${status.value}`}
                      />
                      <label
                        htmlFor={`status-${status.value}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                      >
                        {status.label}
                      </label>
                      <div className={`w-3 h-3 rounded-full ${status.color.replace('bg-', 'bg-').replace('text-', '')}`}></div>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Select value={filters.category || "all"} onValueChange={(value) => updateFilter("category", value)}>
            <SelectTrigger className="h-10 text-xs sm:text-sm w-full sm:w-auto sm:min-w-[140px]" data-testid="select-category">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="existing">Existing Customer</SelectItem>
              <SelectItem value="potential">Potential Customer</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.city || "all"} onValueChange={(value) => updateFilter("city", value)}>
            <SelectTrigger className="h-10 text-xs sm:text-sm w-full sm:w-auto sm:min-w-[140px]" data-testid="select-city">
              <SelectValue placeholder="All Cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}