import { useState } from 'react';
import { Bell, Mail, Smartphone, CheckCircle, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNotificationLogs, useDeleteNotificationLog, getCurrentUser } from "@/lib/database-service";

interface NotificationLog {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  metadata?: any;
  createdAt: string;
}

export default function NotificationDisplay() {
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const notificationsPerPage = 10;
  const user = getCurrentUser();
  const userId = user?.id;

  // Use React Query hooks
  const { data: notificationData, isLoading: loading, error: queryError } = useNotificationLogs(userId, currentPage, notificationsPerPage);
  const deleteNotificationMutation = useDeleteNotificationLog();

  // Extract data from the hook response
  const notifications = notificationData?.notifications || [];
  const totalPages = notificationData?.totalPages || 1;
  const error = queryError ? (queryError as Error).message : null;

  // If no user, show authentication error
  if (!userId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recent Notifications
          </CardTitle>
          <CardDescription>
            User not authenticated
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Please log in to view notifications</p>
        </CardContent>
      </Card>
    );
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      setDeletingId(notificationId);
      await deleteNotificationMutation.mutateAsync(notificationId);
      
      // If current page becomes empty and not first page, go to previous page
      if (notifications.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      // Today - show time
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffInHours < 48) {
      // Yesterday
      return 'Yesterday at ' + date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffInHours < 168) {
      // Within a week - show day and time
      return date.toLocaleDateString('en-US', { 
        weekday: 'short' 
      }) + ' at ' + date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } else {
      // Older - show full date
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  const getLeadName = (notification: NotificationLog) => {
    if (notification.metadata?.leadName) {
      return notification.metadata.leadName;
    }
    
    // Extract lead name from message if available
    const message = notification.message || '';
    if (message.includes('lead:')) {
      return message.split('lead:')[1]?.trim() || 'Unknown Lead';
    }
    
    return 'Unknown Lead';
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_lead':
        return <Mail className="h-4 w-4 text-blue-500" />;
      case 'lead_update':
        return <Mail className="h-4 w-4 text-orange-500" />;
      case 'lead_converted':
        return <Mail className="h-4 w-4 text-green-500" />;
      case 'followup':
        return <Bell className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'new_lead':
        return 'border-l-blue-500 bg-blue-50';
      case 'lead_update':
        return 'border-l-orange-500 bg-orange-50';
      case 'lead_converted':
        return 'border-l-green-500 bg-green-50';
      case 'followup':
        return 'border-l-purple-500 bg-purple-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const generatePageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show pages around current page
      const start = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      const end = Math.min(totalPages, start + maxVisiblePages - 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recent Notifications
          </CardTitle>
          <CardDescription>
            Loading your recent notifications...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recent Notifications
          </CardTitle>
          <CardDescription>
            Unable to load notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {error}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recent Notifications
          </CardTitle>
          <CardDescription>
            Your notification activity will appear here when leads are created or updated
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No notifications yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Recent Notifications
        </CardTitle>
        <CardDescription>
          Page {currentPage} of {totalPages} • Showing {notifications.length} notification(s)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {notifications.map((notification: NotificationLog) => (
          <div 
            key={notification.id} 
            className={`flex items-start gap-3 p-3 border rounded-lg border-l-4 ${getNotificationColor(notification.type)}`}
          >
            <div className="flex-shrink-0 mt-1">
              {getNotificationIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{notification.title}</p>
                  <Badge
                    variant={notification.read ? 'secondary' : 'default'}
                    className="text-xs"
                  >
                    {!notification.read && <CheckCircle className="h-3 w-3 mr-1" />}
                    {notification.read ? 'Read' : 'New'}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteNotification(notification.id)}
                  disabled={deletingId === notification.id}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              
              {/* Lead Name Display */}
              <div className="mb-2">
                <p className="text-xs font-medium text-gray-700">
                  Lead: <span className="text-blue-600">{getLeadName(notification)}</span>
                </p>
              </div>
              
              <p className="text-xs text-gray-600 mb-2">
                {notification.message}
              </p>
              
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {formatDate(notification.createdAt)}
                </p>
                <p className="text-xs text-gray-400 capitalize">
                  {notification.type.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
        ))}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            {generatePageNumbers().map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(page)}
                className="h-8 w-8 p-0"
              >
                {page}
              </Button>
            ))}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}