import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend } from "recharts";
import { TrendingUp, Users, Target, Calendar, Upload, Clock, CheckCircle, XCircle, Plus, WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import LeadForm from "@/components/lead-form";
import type { Lead } from "../../shared/schema";
import { analyticsService } from "@/lib/apis";
import type { AnalyticsResponse } from "@/lib/apis";
import { useToast } from "@/hooks/use-toast";
import { InlineLoader } from "@/components/ui/loader";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ff7675'];

interface AnalyticsProps {
  onAddNewLead?: () => void;
}

export default function Analytics({ onAddNewLead }: AnalyticsProps) {
  const [timeRange, setTimeRange] = useState("7");
  const [, setLocation] = useLocation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const isFetchingRef = useRef(false);
  const errorCountRef = useRef(0);
  const [showNetworkError, setShowNetworkError] = useState(false);
  const [networkErrorMessage, setNetworkErrorMessage] = useState('');

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

  // Fetch analytics data from API
  useEffect(() => {
    // Prevent concurrent calls
    if (isFetchingRef.current) {
      return;
    }

    // Circuit breaker: stop after 3 consecutive errors
    if (errorCountRef.current >= 3) {
      console.error("Too many errors, stopping API calls");
      return;
    }

    const fetchAnalytics = async () => {
      isFetchingRef.current = true;
      setIsLoading(true);
      try {
        const days = parseInt(timeRange, 10);
        const data = await analyticsService.getAnalytics({ days });
        setAnalytics(data);
        // Reset error count on success
        errorCountRef.current = 0;
        // Hide network error dialog if it was shown
        setShowNetworkError(false);
      } catch (error: any) {
        console.error("Error fetching analytics:", error);
        
        // Check if it's an authentication error (401 or 403)
        const isAuthError = error?.response?.status === 401 || error?.response?.status === 403;
        
        // Handle authentication errors with auto-logout
        if (isAuthError) {
          handleAutoLogout();
          return;
        }
        
        // Check if it's a network error (no response from server)
        const isNetworkError = !error?.response || error?.code === 'ECONNABORTED' || error?.code === 'ERR_NETWORK' || error?.message?.includes('Network Error') || error?.message?.includes('timeout');
        const isServerError = error?.response?.status >= 500;
        
        // Increment error count for network/server errors
        if (isNetworkError || isServerError) {
          errorCountRef.current += 1;
        } else {
          // Reset on client errors (4xx)
          errorCountRef.current = 0;
        }

        // Show network error dialog after 2 consecutive errors
        if (errorCountRef.current >= 2) {
          let errorMsg = "Unable to connect to the server. Please check your internet connection and try again.";
          
          if (isNetworkError) {
            errorMsg = "Network connection issue detected. Please check your internet connection.";
          } else if (isServerError) {
            errorMsg = "Server is temporarily unavailable. Please try again later.";
          }
          
          setNetworkErrorMessage(errorMsg);
          setShowNetworkError(true);
        } else {
          // Show toast for first error
          const errorMessage = error?.response?.data?.message || 
                              error?.message || 
                              "Failed to fetch analytics data";
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
        }
      } finally {
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    };

    fetchAnalytics();
  }, [timeRange]);

  // Transform API response to match component structure
  const analyticsData = analytics ? {
    leadsByStatus: analytics.leadStatusBreakdown.reduce((acc, item) => {
      // Normalize status values (combine "new" and "new lead")
      const normalizedStatus = item.status.toLowerCase().trim();
      if (normalizedStatus === "new lead") {
        acc["new"] = (acc["new"] || 0) + item.count;
      } else {
        acc[normalizedStatus] = (acc[normalizedStatus] || 0) + item.count;
      }
      return acc;
    }, {} as Record<string, number>),
    leadSourceBreakdown: analytics.leadSourceBreakdown.reduce((acc, item) => {
      // Normalize source values (handle case differences)
      const normalizedSource = item.source.toLowerCase().trim();
      acc[normalizedSource] = (acc[normalizedSource] || 0) + item.count;
      return acc;
    }, {} as Record<string, number>),
    leadsByCategory: analytics.categoryBreakdown.reduce((acc, item) => {
      // Normalize category values (combine "potential" and "potential customer")
      const normalizedCategory = item.category.toLowerCase().trim();
      if (normalizedCategory === "potential customer") {
        acc["potential"] = (acc["potential"] || 0) + item.count;
      } else {
        acc[normalizedCategory] = (acc[normalizedCategory] || 0) + item.count;
      }
      return acc;
    }, {} as Record<string, number>),
    totalLeads: analytics.basicMetrics.totalLeads,
    convertedLeads: analytics.basicMetrics.convertedLeads,
    conversionRate: analytics.basicMetrics.conversionRate,
    hotLeads: analytics.basicMetrics.hotLeads,
    qualifiedLeads: analytics.basicMetrics.qualifiedLeads,
    lostLeads: analytics.basicMetrics.lostOpportunities,
    followupPending: analytics.basicMetrics.pendingFollowups,
    newLeadsThisWeek: analytics.basicMetrics.newThisWeek,
    newLeadsThisMonth: analytics.basicMetrics.convertedCustomers,
    averageTimeToConvert: analytics.basicMetrics.avgConversionTime,
    next7DaysFollowups: analytics.next7DaysFollowups,
    monthlyTrends: analytics.monthlyTrends,
    followupTimeline: analytics.followupTimeline
  } : {
    leadsByStatus: { new: 0, followup: 0, qualified: 0, hot: 0, converted: 0, lost: 0 },
    leadSourceBreakdown: { website: 0, referral: 0, linkedin: 0, facebook: 0, twitter: 0, instagram: 0, campaign: 0, other: 0 },
    leadsByCategory: { potential: 0, existing: 0 },
    totalLeads: 0,
    convertedLeads: 0,
    conversionRate: 0,
    hotLeads: 0,
    qualifiedLeads: 0,
    lostLeads: 0,
    followupPending: 0,
    newLeadsThisWeek: 0,
    newLeadsThisMonth: 0,
    averageTimeToConvert: 0,
    next7DaysFollowups: [],
    monthlyTrends: [],
    followupTimeline: { overdue: 0, dueThisWeek: 0, future: 0 }
  };

  // Prepare chart data from analytics
  const statusData = [
    { name: 'New', value: analyticsData.leadsByStatus?.new || 0, color: '#0088FE' },
    { name: 'Follow-up', value: analyticsData.leadsByStatus?.followup || 0, color: '#00C49F' },
    { name: 'Qualified', value: analyticsData.leadsByStatus?.qualified || 0, color: '#FFBB28' },
    { name: 'Hot', value: analyticsData.leadsByStatus?.hot || 0, color: '#FF8042' },
    { name: 'Converted', value: analyticsData.leadsByStatus?.converted || 0, color: '#82ca9d' },
    { name: 'Lost', value: analyticsData.leadsByStatus?.lost || 0, color: '#ff7675' },
  ].filter(item => item.value > 0);

  const leadSourceData = [
    { name: 'Website', value: analyticsData.leadSourceBreakdown?.website || 0, color: '#0088FE' },
    { name: 'Referral', value: analyticsData.leadSourceBreakdown?.referral || 0, color: '#00C49F' },
    { name: 'LinkedIn', value: analyticsData.leadSourceBreakdown?.linkedin || 0, color: '#FFBB28' },
    { name: 'Facebook', value: analyticsData.leadSourceBreakdown?.facebook || 0, color: '#FF8042' },
    { name: 'Twitter', value: analyticsData.leadSourceBreakdown?.twitter || 0, color: '#8884d8' },
    { name: 'Instagram', value: analyticsData.leadSourceBreakdown?.instagram || 0, color: '#E1306C' },
    { name: 'Campaign', value: analyticsData.leadSourceBreakdown?.campaign || 0, color: '#82ca9d' },
    { name: 'Other', value: analyticsData.leadSourceBreakdown?.other || 0, color: '#ff7675' },
  ].filter(item => item.value > 0);

  const categoryData = [
    { name: 'Potential', value: analyticsData.leadsByCategory?.potential || 0, color: '#0088FE' },
    { name: 'Existing', value: analyticsData.leadsByCategory?.existing || 0, color: '#00C49F' },
  ].filter(item => item.value > 0);

  // Export functionality
  const exportReport = () => {
    if (!analytics) {
      toast({
        title: "Error",
        description: "No analytics data available to export",
        variant: "destructive",
      });
      return;
    }

    const reportData = {
      generatedAt: new Date().toISOString(),
      timeRange: `${timeRange} days`,
      period: analytics.period,
      summary: {
        totalLeads: analyticsData.totalLeads,
        convertedLeads: analyticsData.convertedLeads,
        conversionRate: `${analyticsData.conversionRate}%`,
        hotLeads: analyticsData.hotLeads,
        qualifiedLeads: analyticsData.qualifiedLeads,
        lostLeads: analyticsData.lostLeads,
        followupPending: analyticsData.followupPending,
        newLeadsThisWeek: analyticsData.newLeadsThisWeek,
        newLeadsThisMonth: analyticsData.newLeadsThisMonth,
        averageTimeToConvert: `${analyticsData.averageTimeToConvert} days`
      },
      leadSourceBreakdown: analytics.leadSourceBreakdown,
      leadStatusBreakdown: analytics.leadStatusBreakdown,
      categoryBreakdown: analytics.categoryBreakdown,
      next7DaysFollowups: analytics.next7DaysFollowups,
      monthlyTrends: analytics.monthlyTrends
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Retry loading analytics after network error
  const handleRetry = async () => {
    errorCountRef.current = 0;
    setShowNetworkError(false);
    setIsLoading(true);
    
    try {
      const days = parseInt(timeRange, 10);
      const data = await analyticsService.getAnalytics({ days });
      setAnalytics(data);
      errorCountRef.current = 0;
      setShowNetworkError(false);
    } catch (error: any) {
      console.error("Error retrying analytics:", error);
      
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
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <InlineLoader text="Loading analytics data..." />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-8 sm:mb-10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900" data-testid="text-analytics-title">
              Analytics Dashboard
            </h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">Comprehensive insights into your lead management performance</p>
          </div>
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-full sm:w-40 text-sm" data-testid="select-time-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7" data-testid="option-7-days">Last 7 days</SelectItem>
                <SelectItem value="30" data-testid="option-30-days">Last 30 days</SelectItem>
                <SelectItem value="90" data-testid="option-90-days">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={exportReport}
              variant="outline"
              size="sm"
              className="text-sm"
              data-testid="button-export-report"
            >
              <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Export Report</span>
              <span className="sm:hidden">Export</span>
            </Button>
            <Button
              className="btn-impressive-primary text-sm"
              size="sm"
              onClick={() => {
                setEditingLead(null);
                setIsFormOpen(true);
              }}
              data-testid="button-add-lead"
            >
              <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 icon" />
              <span className="hidden sm:inline">Add New Lead</span>
              <span className="sm:hidden">Add Lead</span>
            </Button>
          </div>
        </div>

        {/* Lead Management Overview */}
        <div className="mb-6 sm:mb-8">
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Lead Management Overview</h1>
            <p className="text-xs sm:text-sm text-gray-600">Track and manage your sales pipeline with real-time insights</p>
          </div>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Potential Customers Card */}
            <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-xl"></div>
              <CardContent className="p-3 sm:p-4 relative">
                {/* Background pattern */}
                <div className="absolute top-0 right-0 opacity-5">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 transform rotate-12 translate-x-4 sm:translate-x-6 -translate-y-4 sm:-translate-y-6">
                    <Users size={64} className="sm:w-24 sm:h-24" />
                  </div>
                </div>

                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <h3 className="text-xs font-semibold text-gray-700 leading-tight">Potential Customers</h3>
                  <div className="p-1.5 sm:p-2 bg-blue-50 rounded-lg group-hover:scale-110 transition-transform duration-200">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-end justify-between">
                    <div className="text-lg sm:text-2xl font-bold text-gray-900 leading-none">
                      {(analyticsData.leadsByCategory?.potential || 0).toLocaleString()}
                    </div>
                    <div className="flex items-center space-x-1 text-xs font-medium text-gray-500">
                      <span>This Week</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-gray-50">
                    <span className="text-xs font-medium text-blue-700">New This Week</span>
                    <span className="text-xs font-bold text-blue-600">
                      {(analyticsData.leadsByStatus?.new || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pending Follow-ups Card */}
            <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-xl"></div>
              <CardContent className="p-3 sm:p-4 relative">
                {/* Background pattern */}
                <div className="absolute top-0 right-0 opacity-5">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 transform rotate-12 translate-x-4 sm:translate-x-6 -translate-y-4 sm:-translate-y-6">
                    <Clock size={64} className="sm:w-24 sm:h-24" />
                  </div>
                </div>

                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <h3 className="text-xs font-semibold text-gray-700 leading-tight">Pending Follow-ups</h3>
                  <div className="p-1.5 sm:p-2 bg-amber-50 rounded-lg group-hover:scale-110 transition-transform duration-200">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600" />
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-end justify-between">
                    <div className="text-lg sm:text-2xl font-bold text-gray-900 leading-none">
                      {(analyticsData.followupPending || 0).toLocaleString()}
                    </div>
                    <div className="flex items-center space-x-1 text-xs font-medium text-gray-500">
                      <span>This Week</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-gray-50">
                    <span className="text-xs font-medium text-amber-700">Due This Week</span>
                    <span className="text-xs font-bold text-amber-600">
                      {analyticsData.followupTimeline?.dueThisWeek || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Qualified Leads Card */}
            <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 rounded-l-xl"></div>
              <CardContent className="p-3 sm:p-4 relative">
                {/* Background pattern */}
                <div className="absolute top-0 right-0 opacity-5">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 transform rotate-12 translate-x-4 sm:translate-x-6 -translate-y-4 sm:-translate-y-6">
                    <Target size={64} className="sm:w-24 sm:h-24" />
                  </div>
                </div>

                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <h3 className="text-xs font-semibold text-gray-700 leading-tight">Qualified Leads</h3>
                  <div className="p-1.5 sm:p-2 bg-purple-50 rounded-lg group-hover:scale-110 transition-transform duration-200">
                    <Target className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-end justify-between">
                    <div className="text-lg sm:text-2xl font-bold text-gray-900 leading-none">
                      {(analyticsData.qualifiedLeads || 0).toLocaleString()}
                    </div>
                    <div className="flex items-center space-x-1 text-xs font-medium text-gray-500">
                      <span>This Week</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-gray-50">
                    <span className="text-xs font-medium text-purple-700">Ready to Convert</span>
                    <span className="text-xs font-bold text-purple-600">
                      {(analyticsData.qualifiedLeads || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hot Leads Card */}
            <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-orange-500 rounded-l-xl"></div>
              <CardContent className="p-3 sm:p-4 relative">
                {/* Background pattern */}
                <div className="absolute top-0 right-0 opacity-5">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 transform rotate-12 translate-x-4 sm:translate-x-6 -translate-y-4 sm:-translate-y-6">
                    <TrendingUp size={64} className="sm:w-24 sm:h-24" />
                  </div>
                </div>

                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <h3 className="text-xs font-semibold text-gray-700 leading-tight">Hot Leads</h3>
                  <div className="p-1.5 sm:p-2 bg-orange-50 rounded-lg group-hover:scale-110 transition-transform duration-200">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-end justify-between">
                    <div className="text-lg sm:text-2xl font-bold text-gray-900 leading-none">
                      {(analyticsData.hotLeads || 0).toLocaleString()}
                    </div>
                    <div className="flex items-center space-x-1 text-xs font-medium text-gray-500">
                      <span>This Week</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-gray-50">
                    <span className="text-xs font-medium text-orange-700">High Priority</span>
                    <span className="text-xs font-bold text-orange-600">
                      {(analyticsData.hotLeads || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Converted Customers Card */}
            <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-l-xl"></div>
              <CardContent className="p-3 sm:p-4 relative">
                {/* Background pattern */}
                <div className="absolute top-0 right-0 opacity-5">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 transform rotate-12 translate-x-4 sm:translate-x-6 -translate-y-4 sm:-translate-y-6">
                    <CheckCircle size={64} className="sm:w-24 sm:h-24" />
                  </div>
                </div>

                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <h3 className="text-xs font-semibold text-gray-700 leading-tight">Converted Customers</h3>
                  <div className="p-1.5 sm:p-2 bg-emerald-50 rounded-lg group-hover:scale-110 transition-transform duration-200">
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600" />
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-end justify-between">
                    <div className="text-lg sm:text-2xl font-bold text-gray-900 leading-none">
                      {(analyticsData.convertedLeads || 0).toLocaleString()}
                    </div>
                    <div className="flex items-center space-x-1 text-xs font-medium text-gray-500">
                      <span>This Month</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-gray-50">
                    <span className="text-xs font-medium text-emerald-700">This Month</span>
                    <span className="text-xs font-bold text-emerald-600">
                      {(analyticsData.convertedLeads || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lost Opportunities Card */}
            <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-red-500 rounded-l-xl"></div>
              <CardContent className="p-3 sm:p-4 relative">
                {/* Background pattern */}
                <div className="absolute top-0 right-0 opacity-5">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 transform rotate-12 translate-x-4 sm:translate-x-6 -translate-y-4 sm:-translate-y-6">
                    <XCircle size={64} className="sm:w-24 sm:h-24" />
                  </div>
                </div>

                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <h3 className="text-xs font-semibold text-gray-700 leading-tight">Lost Opportunities</h3>
                  <div className="p-1.5 sm:p-2 bg-red-50 rounded-lg group-hover:scale-110 transition-transform duration-200">
                    <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-end justify-between">
                    <div className="text-lg sm:text-2xl font-bold text-gray-900 leading-none">
                      {(analyticsData.lostLeads || 0).toLocaleString()}
                    </div>
                    <div className="flex items-center space-x-1 text-xs font-medium text-gray-500">
                      <span>This Month</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-gray-50">
                    <span className="text-xs font-medium text-red-700">Closed Lost</span>
                    <span className="text-xs font-bold text-red-600">
                      {(analyticsData.lostLeads || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Conversion Rate Card */}
            <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-teal-500 rounded-l-xl"></div>
              <CardContent className="p-3 sm:p-4 relative">
                {/* Background pattern */}
                <div className="absolute top-0 right-0 opacity-5">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 transform rotate-12 translate-x-4 sm:translate-x-6 -translate-y-4 sm:-translate-y-6">
                    <TrendingUp size={64} className="sm:w-24 sm:h-24" />
                  </div>
                </div>

                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <h3 className="text-xs font-semibold text-gray-700 leading-tight">Conversion Rate</h3>
                  <div className="p-1.5 sm:p-2 bg-teal-50 rounded-lg group-hover:scale-110 transition-transform duration-200">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-teal-600" />
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-end justify-between">
                    <div className="text-lg sm:text-2xl font-bold text-gray-900 leading-none">
                      {`${analyticsData.conversionRate || 0}%`}
                    </div>
                    <div className="flex items-center space-x-1 text-xs font-medium text-gray-500">
                      <span>This Month</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-gray-50">
                    <span className="text-xs font-medium text-teal-700">Success Rate</span>
                    <span className="text-xs font-bold text-teal-600">
                      {`${analyticsData.conversionRate || 0}%`}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Avg. Conversion Time Card */}
            <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-xl"></div>
              <CardContent className="p-3 sm:p-4 relative">
                {/* Background pattern */}
                <div className="absolute top-0 right-0 opacity-5">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 transform rotate-12 translate-x-4 sm:translate-x-6 -translate-y-4 sm:-translate-y-6">
                    <Clock size={64} className="sm:w-24 sm:h-24" />
                  </div>
                </div>

                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <h3 className="text-xs font-semibold text-gray-700 leading-tight">Avg. Conversion Time</h3>
                  <div className="p-1.5 sm:p-2 bg-indigo-50 rounded-lg group-hover:scale-110 transition-transform duration-200">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-600" />
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-end justify-between">
                    <div className="text-lg sm:text-2xl font-bold text-gray-900 leading-none">
                      {`${analyticsData.averageTimeToConvert || 0}`}
                    </div>
                    <div className="flex items-center space-x-1 text-xs font-medium text-gray-500">
                      <span>Average</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-gray-50">
                    <span className="text-xs font-medium text-indigo-700">Days Average</span>
                    <span className="text-xs font-bold text-indigo-600">
                      {`${analyticsData.averageTimeToConvert || 0}d`}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Follow-up Timeline Card */}
          <Card className="hover:shadow-lg transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 rounded-l-xl"></div>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">Follow-up Timeline</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Manage your upcoming and overdue follow-ups</p>
                </div>
                <div className="p-2 sm:p-3 bg-cyan-50 rounded-lg">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-600" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {/* Overdue */}
                <div className="text-center group">
                  <div className="bg-red-50 rounded-xl p-3 sm:p-4 group-hover:bg-red-100 transition-colors duration-200">
                    <div className="text-xl sm:text-2xl font-bold text-red-600 mb-1 sm:mb-2">
                      {analyticsData.followupTimeline?.overdue || 0}
                    </div>
                    <div className="text-xs font-semibold text-red-700 mb-1">Overdue</div>
                    <div className="text-xs text-red-600">Requires immediate attention</div>
                  </div>
                </div>

                {/* Due Soon */}
                <div className="text-center group">
                  <div className="bg-amber-50 rounded-xl p-3 sm:p-4 group-hover:bg-amber-100 transition-colors duration-200">
                    <div className="text-xl sm:text-2xl font-bold text-amber-600 mb-1 sm:mb-2">
                      {analyticsData.followupTimeline?.dueThisWeek || 0}
                    </div>
                    <div className="text-xs font-semibold text-amber-700 mb-1">Due This Week</div>
                    <div className="text-xs text-amber-600">Plan your outreach</div>
                  </div>
                </div>

                {/* Future */}
                <div className="text-center group">
                  <div className="bg-blue-50 rounded-xl p-3 sm:p-4 group-hover:bg-blue-100 transition-colors duration-200">
                    <div className="text-xl sm:text-2xl font-bold text-blue-600 mb-1 sm:mb-2">
                      {analyticsData.followupTimeline?.future || 0}
                    </div>
                    <div className="text-xs font-semibold text-blue-700 mb-1">Future</div>
                    <div className="text-xs text-blue-600">Scheduled ahead</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
          {/* Lead Source Breakdown */}
          <Card data-testid="card-lead-source-chart">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">Lead Source Breakdown</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Where your leads are coming from</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leadSourceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {leadSourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Leads by Status */}
          <Card data-testid="card-status-chart">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">Leads by Status</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Current distribution of lead statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8">
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trends */}

        <div className="grid grid-cols-1 mb-6 sm:mb-8">
          <Card data-testid="card-monthly-trends">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">Monthly Trends</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Leads added vs. converted over time with conversion rate trend
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsData.monthlyTrends || []}>
                    <defs>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorConverted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="leads" stroke="#8884d8" fillOpacity={1} fill="url(#colorLeads)" name="Leads Added" />
                    <Area type="monotone" dataKey="converted" stroke="#82ca9d" fillOpacity={1} fill="url(#colorConverted)" name="Leads Converted" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>


      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <LeadForm
            lead={editingLead}
            onClose={() => {
              setIsFormOpen(false);
              setEditingLead(null);
            }}
          />
        </DialogContent>
      </Dialog>

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
    </AppLayout>
  );
}