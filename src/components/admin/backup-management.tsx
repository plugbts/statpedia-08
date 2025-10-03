// Backup and rollback management component for admins
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Database, 
  Download, 
  Upload, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  Shield,
  FileText
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { backupService } from '@/services/backup-service';
import { databaseRollbackService } from '@/services/database-rollback-service';

export const BackupManagement: React.FC = () => {
  const [backupStatus, setBackupStatus] = useState(backupService.getBackupStatus());
  const [databaseHealth, setDatabaseHealth] = useState<any>(null);
  const [rollbackLog, setRollbackLog] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('status');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      setBackupStatus(backupService.getBackupStatus());
      setDatabaseHealth(await databaseRollbackService.getDatabaseHealth());
      setRollbackLog(databaseRollbackService.getRollbackLog());
    } catch (error) {
      console.error('Error loading backup data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsLoading(true);
    try {
      const result = await backupService.createDatabaseBackup();
      if (result) {
        toast({
          title: "Backup Created",
          description: "Database backup created successfully",
        });
        loadData();
      } else {
        toast({
          title: "Backup Failed",
          description: "Failed to create database backup",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while creating backup",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRollbackPoint = async () => {
    setIsLoading(true);
    try {
      const rollbackId = await databaseRollbackService.createRollbackPoint('Manual rollback point');
      if (rollbackId) {
        toast({
          title: "Rollback Point Created",
          description: `Rollback point created: ${rollbackId}`,
        });
        loadData();
      } else {
        toast({
          title: "Rollback Point Failed",
          description: "Failed to create rollback point",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while creating rollback point",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmergencyRollback = async () => {
    if (!confirm('Are you sure you want to perform an emergency rollback? This will restore the database to the last backup point.')) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await databaseRollbackService.emergencyRollback();
      if (result.success) {
        toast({
          title: "Emergency Rollback Complete",
          description: result.message,
        });
        loadData();
      } else {
        toast({
          title: "Rollback Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred during emergency rollback",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportBackup = () => {
    try {
      const backupData = backupService.exportBackup();
      if (backupData) {
        const blob = new Blob([backupData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `statpedia-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Backup Exported",
          description: "Backup data exported successfully",
        });
      } else {
        toast({
          title: "Export Failed",
          description: "No backup data available to export",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while exporting backup",
        variant: "destructive",
      });
    }
  };

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backupData = e.target?.result as string;
        const success = backupService.importBackup(backupData);
        
        if (success) {
          toast({
            title: "Backup Imported",
            description: "Backup data imported successfully",
          });
          loadData();
        } else {
          toast({
            title: "Import Failed",
            description: "Failed to import backup data",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Invalid backup file format",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleExportRecoveryScript = () => {
    databaseRollbackService.exportRecoveryScript();
    toast({
      title: "Recovery Script Exported",
      description: "Database recovery script downloaded",
    });
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4" />;
      case 'degraded': return <AlertTriangle className="w-4 h-4" />;
      case 'critical': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Backup & Recovery Management</h2>
          <p className="text-muted-foreground">Manage database backups and rollback points</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreateBackup} disabled={isLoading}>
            <Database className="w-4 h-4 mr-2" />
            Create Backup
          </Button>
          <Button onClick={handleCreateRollbackPoint} disabled={isLoading} variant="outline">
            <Shield className="w-4 h-4 mr-2" />
            Create Rollback Point
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="rollback">Rollback</TabsTrigger>
          <TabsTrigger value="recovery">Recovery</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Database Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                {databaseHealth ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {getHealthStatusIcon(databaseHealth.status)}
                      <span className={`font-medium ${getHealthStatusColor(databaseHealth.status)}`}>
                        {databaseHealth.status.toUpperCase()}
                      </span>
                    </div>
                    
                    {databaseHealth.issues.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Issues:</p>
                        {databaseHealth.issues.map((issue: string, index: number) => (
                          <Badge key={index} variant="destructive" className="text-xs">
                            {issue}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <div className="text-sm text-muted-foreground">
                      <p>Rollback Points: {databaseHealth.rollbackPoints}</p>
                      {databaseHealth.lastBackup && (
                        <p>Last Backup: {new Date(databaseHealth.lastBackup).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Loading...</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Backup Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>User Backup</span>
                    <Badge variant={backupStatus.userBackup ? "default" : "secondary"}>
                      {backupStatus.userBackup ? "Available" : "None"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Auth Backup</span>
                    <Badge variant={backupStatus.authBackup ? "default" : "secondary"}>
                      {backupStatus.authBackup ? "Available" : "None"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Database Backup</span>
                    <Badge variant={backupStatus.databaseBackup ? "default" : "secondary"}>
                      {backupStatus.databaseBackup ? "Available" : "None"}
                    </Badge>
                  </div>
                  
                  {backupStatus.lastBackup && (
                    <div className="text-sm text-muted-foreground">
                      Last Backup: {new Date(backupStatus.lastBackup).toLocaleString()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="backups" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Backup Operations</CardTitle>
              <CardDescription>Create, export, and import database backups</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button onClick={handleCreateBackup} disabled={isLoading} className="h-20 flex-col">
                  <Database className="w-6 h-6 mb-2" />
                  Create Backup
                </Button>
                
                <Button onClick={handleExportBackup} variant="outline" className="h-20 flex-col">
                  <Download className="w-6 h-6 mb-2" />
                  Export Backup
                </Button>
                
                <div className="h-20 flex flex-col">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="hidden"
                    id="import-backup"
                  />
                  <label htmlFor="import-backup">
                    <Button variant="outline" className="h-20 w-full flex-col cursor-pointer">
                      <Upload className="w-6 h-6 mb-2" />
                      Import Backup
                    </Button>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rollback" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rollback Points</CardTitle>
              <CardDescription>Manage database rollback points and perform rollbacks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 mb-4">
                <Button onClick={handleCreateRollbackPoint} disabled={isLoading} variant="outline">
                  <Shield className="w-4 h-4 mr-2" />
                  Create Rollback Point
                </Button>
                
                <Button 
                  onClick={handleEmergencyRollback} 
                  disabled={isLoading || rollbackLog.length === 0}
                  variant="destructive"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Emergency Rollback
                </Button>
              </div>

              {rollbackLog.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="font-medium">Available Rollback Points:</h4>
                  {rollbackLog.map((point: any) => (
                    <div key={point.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{point.description}</p>
                        <p className="text-sm text-muted-foreground">
                          Created: {new Date(point.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline">{point.id}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No rollback points available. Create a rollback point before making changes.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recovery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recovery Tools</CardTitle>
              <CardDescription>Emergency recovery and database repair tools</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Use these tools only in emergency situations. Always create a backup before performing recovery operations.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button onClick={handleExportRecoveryScript} variant="outline" className="h-20 flex-col">
                  <FileText className="w-6 h-6 mb-2" />
                  Export Recovery Script
                </Button>
                
                <Button 
                  onClick={handleEmergencyRollback} 
                  disabled={isLoading || rollbackLog.length === 0}
                  variant="destructive"
                  className="h-20 flex-col"
                >
                  <RotateCcw className="w-6 h-6 mb-2" />
                  Emergency Rollback
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                <p><strong>Recovery Script:</strong> SQL script to recreate missing database tables</p>
                <p><strong>Emergency Rollback:</strong> Restore database to the most recent backup point</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
