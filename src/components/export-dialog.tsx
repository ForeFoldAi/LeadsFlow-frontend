import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Filter } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { leadsService, UserRole } from "@/lib/apis";
import type { GetLeadsQuery } from "@/lib/apis";
import { useToast } from "@/hooks/use-toast";

interface ExportDialogProps {
  currentFilters: {
    search: string;
    status: string | string[];
    category: string;
    city: string;
  };
}

export default function ExportDialog({ currentFilters }: ExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const [exportOptions, setExportOptions] = useState({
    format: "csv",
    useCurrentFilters: true,
    includeFields: {
      personalInfo: true,
      contactInfo: true,
      addressInfo: true,
      companyInfo: true,
      followupInfo: true,
    }
  });

  const checkExportPermission = (): boolean => {
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) {
        console.log('[ExportDialog] No user data in localStorage');
        return false;
      }
      
      const user = JSON.parse(userStr);
      console.log('[ExportDialog] Checking export permission for user:', {
        role: user.role,
        permissions: user.permissions,
        canExportLeads: user.permissions?.canExportLeads
      });
      
      // Management role users can always export
      if (user.role === UserRole.MANAGEMENT) {
        console.log('[ExportDialog] User is Management - export allowed');
        return true;
      }
      
      // Check if user has export permission
      const hasPermission = user.permissions?.canExportLeads === true;
      console.log('[ExportDialog] Export permission check result:', hasPermission);
      return hasPermission;
    } catch (error) {
      console.error("Error checking export permission:", error);
      return false;
    }
  };

  const handleExport = async () => {
    // Check permission before exporting
    const hasPermission = checkExportPermission();
    console.log('[ExportDialog] handleExport - Permission check result:', hasPermission);
    
    if (!hasPermission) {
      // Double-check by reading directly from localStorage
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          console.log('[ExportDialog] Current user data from localStorage:', user);
          console.log('[ExportDialog] User permissions:', user.permissions);
          console.log('[ExportDialog] canExportLeads value:', user.permissions?.canExportLeads);
          console.log('[ExportDialog] canExportLeads type:', typeof user.permissions?.canExportLeads);
          console.log('[ExportDialog] canExportLeads === true?', user.permissions?.canExportLeads === true);
          console.log('[ExportDialog] canExportLeads == true?', user.permissions?.canExportLeads == true);
        }
      } catch (e) {
        console.error('[ExportDialog] Error reading localStorage:', e);
      }
      
      toast({
        title: "Access Denied",
        description: "You don't have permission to export data. Please contact management.",
        variant: "destructive",
      });
      setIsOpen(false);
      return;
    }

    setIsExporting(true);
    try {
      const query: GetLeadsQuery = {};
      
      if (exportOptions.useCurrentFilters) {
        if (currentFilters.search) query.search = currentFilters.search;
        if (currentFilters.status) {
          if (Array.isArray(currentFilters.status) && currentFilters.status.length > 0) {
            query.status = currentFilters.status;
          } else if (typeof currentFilters.status === "string" && currentFilters.status !== "all") {
            query.status = currentFilters.status;
          }
        }
        if (currentFilters.category && currentFilters.category !== "all") {
          query.category = currentFilters.category;
        }
        if (currentFilters.city && currentFilters.city !== "all") {
          query.city = currentFilters.city;
        }
      }

      // Use the API service to export leads
      await leadsService.downloadCsv(query);
      
      toast({
        title: "Export Successful",
        description: "Leads exported successfully",
      });
      
      setIsOpen(false);
    } catch (error: any) {
      console.error("Export failed:", error);
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          "Failed to export leads";
      toast({
        title: "Export Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getFilterSummary = () => {
    const activeFilters = [];
    if (currentFilters.search) activeFilters.push(`Search: "${currentFilters.search}"`);
    if (currentFilters.status) {
      if (Array.isArray(currentFilters.status) && currentFilters.status.length > 0) {
        activeFilters.push(`Status: ${currentFilters.status.join(", ")}`);
      } else if (typeof currentFilters.status === "string") {
        activeFilters.push(`Status: ${currentFilters.status}`);
      }
    }
    if (currentFilters.category) activeFilters.push(`Category: ${currentFilters.category}`);
    if (currentFilters.city) activeFilters.push(`City: ${currentFilters.city}`);
    
    return activeFilters.length > 0 ? activeFilters.join(", ") : "No filters applied";
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="btn-impressive-action text-xs sm:text-sm whitespace-nowrap flex-shrink-0 px-3 py-2 h-9" data-testid="button-export">
          <Upload className="mr-1 h-3 w-3 sm:h-4 sm:w-4 icon" />
          <span>Export</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Export Leads
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Format */}
          <div>
            <Label className="text-sm font-medium">Export Format</Label>
            <Select value={exportOptions.format} onValueChange={(value) => 
              setExportOptions({...exportOptions, format: value})
            }>
              <SelectTrigger className="mt-2" data-testid="select-export-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (Comma Separated Values)</SelectItem>
                <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Filter Options */}
          <div>
            <Label className="text-sm font-medium">Data Selection</Label>
            <div className="mt-3 space-y-3">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="use-filters"
                  checked={exportOptions.useCurrentFilters}
                  onCheckedChange={(checked) => 
                    setExportOptions({...exportOptions, useCurrentFilters: checked as boolean})
                  }
                  data-testid="checkbox-use-filters"
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="use-filters" className="text-sm font-normal">
                    Use current filters
                  </Label>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Filter className="h-3 w-3" />
                    <span data-testid="text-filter-summary">{getFilterSummary()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button 
              className="btn-impressive-secondary"
              onClick={() => setIsOpen(false)}
              data-testid="button-cancel-export"
            >
              Cancel
            </Button>
            <Button 
              className="btn-impressive-success"
              onClick={handleExport}
              data-testid="button-confirm-export"
              disabled={isExporting}
            >
              <Upload className="mr-2 h-4 w-4 icon" />
              {isExporting ? "Exporting..." : "Export Data"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}