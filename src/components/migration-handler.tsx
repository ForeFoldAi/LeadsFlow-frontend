import { useEffect, useState } from "react";
import { useCheckMigrationStatus, useMigrateLocalStorage, collectLocalStorageData, clearLocalStorageData, hasLocalStorageData } from "@/lib/database-service";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Database, CheckCircle, AlertCircle } from "lucide-react";

interface MigrationHandlerProps {
  children: React.ReactNode;
}

export default function MigrationHandler({ children }: MigrationHandlerProps) {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationCompleted, setMigrationCompleted] = useState(false);
  const [migrationAttempted, setMigrationAttempted] = useState(false);
  const { toast } = useToast();

  // Check if migration is needed
  const { data: migrationStatus, isLoading: checkingStatus, error: statusError } = useCheckMigrationStatus();
  const migrateMutation = useMigrateLocalStorage();

  const handleMigration = async () => {
    try {
      setIsMigrating(true);
      
      // Collect localStorage data
      const localStorageData = collectLocalStorageData();
      
      // Perform migration
      await migrateMutation.mutateAsync(localStorageData);
      
      // Clear localStorage data after successful migration
      clearLocalStorageData();
      
      setMigrationCompleted(true);
      
      toast({
        title: "Migration Completed",
        description: "Your data has been successfully migrated to the database.",
      });
      
      // Refresh the page to ensure all components use the new database data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error("Migration failed:", error);
      toast({
        title: "Migration Failed",
        description: "Failed to migrate data. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsMigrating(false);
    }
  };

  // Auto-migrate if needed and localStorage data exists
  useEffect(() => {
    if (migrationStatus?.needsMigration && !isMigrating && !migrationCompleted && !migrationAttempted) {
      setMigrationAttempted(true);
      
      const localStorageData = collectLocalStorageData();
      const hasData = hasLocalStorageData(localStorageData);
      
      if (hasData) {
        // Auto-migrate after a short delay
        const timer = setTimeout(() => {
          handleMigration();
        }, 1000);
        
        return () => clearTimeout(timer);
      } else {
        // No localStorage data to migrate, but user needs default settings
        // Create default settings without migration
        const timer = setTimeout(async () => {
          try {
            setIsMigrating(true);
            const defaultData = {
              preferenceSettings: {
                defaultView: 'table',
                itemsPerPage: '20',
                autoSave: true,
                compactMode: false,
                exportFormat: 'csv',
                exportNotes: true
              },
              notificationSettings: {
                newLeads: true,
                followUps: true,
                hotLeads: true,
                conversions: true,
                browserPush: false,
                dailySummary: false,
                emailNotifications: true
              },
              securitySettings: {
                twoFactorEnabled: false,
                loginNotifications: true,
                sessionTimeout: '30'
              },
              userApiKey: `lf_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
              notificationLogs: []
            };
            
            await migrateMutation.mutateAsync(defaultData);
            setMigrationCompleted(true);
            
            toast({
              title: "Account Setup Complete",
              description: "Your account has been configured with default settings.",
            });
            
            // Refresh the page to ensure all components use the new database data
            setTimeout(() => {
              window.location.reload();
            }, 2000);
            
          } catch (error) {
            console.error("Default setup failed:", error);
            toast({
              title: "Setup Failed",
              description: "Failed to setup default settings. Please refresh the page.",
              variant: "destructive",
            });
          } finally {
            setIsMigrating(false);
          }
        }, 1000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [migrationStatus?.needsMigration, isMigrating, migrationCompleted, migrationAttempted]);

  // Show loading while checking migration status
  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
            <CardTitle>Checking System Status</CardTitle>
            <CardDescription>
              Verifying your data configuration...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Show error if status check failed
  if (statusError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle>System Error</CardTitle>
            <CardDescription>
              Unable to check system status. Please refresh the page.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show migration UI if needed
  if (migrationStatus?.needsMigration && !migrationCompleted) {
    const localStorageData = collectLocalStorageData();
    const hasData = hasLocalStorageData(localStorageData);

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Database className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle>System Update</CardTitle>
            <CardDescription>
              {hasData 
                ? "We're upgrading your data storage for better security and reliability."
                : "Setting up your account with the latest system improvements."
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {hasData && (
              <div className="text-sm text-gray-600">
                <p>Found existing data that will be migrated:</p>
                <ul className="mt-2 text-left">
                  {localStorageData.preferenceSettings && <li>• User preferences</li>}
                  {localStorageData.notificationSettings && <li>• Notification settings</li>}
                  {localStorageData.securitySettings && <li>• Security settings</li>}
                  {localStorageData.userApiKey && <li>• API key</li>}
                  {localStorageData.notificationLogs && <li>• Notification history</li>}
                </ul>
              </div>
            )}
            
            <Button 
              onClick={handleMigration} 
              disabled={isMigrating}
              className="w-full"
            >
              {isMigrating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Migrating Data...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  {hasData ? "Migrate Data" : "Setup Account"}
                </>
              )}
            </Button>
            
            {isMigrating && (
              <p className="text-sm text-gray-500">
                This may take a few moments. Please don't close this window.
              </p>
            )}

            {/* Manual refresh option for stuck users */}
            {!isMigrating && migrationAttempted && (
              <div className="pt-4 border-t">
                <p className="text-xs text-gray-500 mb-2">
                  If you're experiencing issues, you can:
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  Refresh Page
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show completion message
  if (migrationCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>Migration Complete</CardTitle>
            <CardDescription>
              Your data has been successfully migrated to the database.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              The page will refresh automatically to load your updated settings.
            </p>
            <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render children if no migration is needed
  return <>{children}</>;
} 