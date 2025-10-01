import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { logger, LogEntry, LogLevel } from '@/utils/console-logger';
import { TestAPIDebug } from '@/components/test-api-debug';
import { DebugAPITest } from '@/components/debug-api-test';
import { unifiedSportsAPI } from '@/services/unified-sports-api';
import { sportsGameOddsAPI } from '@/services/sportsgameodds-api';
import { 
  Terminal, 
  Trash2, 
  Download, 
  RefreshCw, 
  Eye, 
  EyeOff,
  Filter,
  Search,
  AlertCircle,
  CheckCircle,
  Info,
  Bug,
  Activity
} from 'lucide-react';

export const DevConsole: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Debug: Dev Console component initialized

  useEffect(() => {
    // Check if user is owner
    const checkOwner = () => {
      const ownerEmails = ['jackie@statpedia.com', 'admin@statpedia.com'];
      const currentUser = localStorage.getItem('userEmail') || '';
      const ownerStatus = ownerEmails.includes(currentUser) || currentUser.includes('jackie');
      // Debug: Owner check completed
      setIsOwner(ownerStatus);
    };

    checkOwner();
    
    // TEMPORARY: Force owner status for debugging
    setIsOwner(true);

    // Set up proper logging system - use only the logger, don't intercept console
    // Add initial logs to show Dev Console is active
    logger.info('DevConsole', 'Dev Console component mounted and ready');
    logger.success('DevConsole', 'Console logging system initialized');
    
    // Update logs every 500ms to get new logs from the logger
    const interval = setInterval(() => {
      const loggerLogs = logger.getLogs();
      
      // Only update if we have new logs to prevent unnecessary re-renders
      setLogs(prevLogs => {
        // Check if we have new logs by comparing lengths and last few entries
        if (loggerLogs.length === prevLogs.length) {
          // Same length, check if last few entries are the same
          const lastPrevLogs = prevLogs.slice(-3);
          const lastLoggerLogs = loggerLogs.slice(-3);
          
          const isSame = lastPrevLogs.every((prevLog, index) => {
            const loggerLog = lastLoggerLogs[index];
            return loggerLog && 
                   prevLog.timestamp === loggerLog.timestamp && 
                   prevLog.message === loggerLog.message && 
                   prevLog.category === loggerLog.category;
          });
          
          if (isSame) {
            return prevLogs; // No new logs, don't update state
          }
        }
        
        // We have new logs, update with the latest from logger
        return [...loggerLogs].slice(-1000); // Keep last 1000 logs
      });
    }, 500); // Reduced interval for more responsive updates

    return () => {
      clearInterval(interval);
      // Don't restore console methods since we're not intercepting them
    };
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter(log => {
    const matchesLevel = filterLevel === 'all' || log.level === filterLevel;
    const matchesSearch = searchQuery === '' || 
      log.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const getLevelIcon = (level: LogLevel) => {
    const icons = {
      [LogLevel.INFO]: <Info className="h-3 w-3 text-blue-500" />,
      [LogLevel.SUCCESS]: <CheckCircle className="h-3 w-3 text-green-500" />,
      [LogLevel.WARNING]: <AlertCircle className="h-3 w-3 text-orange-500" />,
      [LogLevel.ERROR]: <AlertCircle className="h-3 w-3 text-red-500" />,
      [LogLevel.DEBUG]: <Bug className="h-3 w-3 text-purple-500" />,
      [LogLevel.API]: <Terminal className="h-3 w-3 text-cyan-500" />,
      [LogLevel.STATE]: <RefreshCw className="h-3 w-3 text-lime-500" />,
      [LogLevel.FILTER]: <Filter className="h-3 w-3 text-orange-500" />
    };
    return icons[level] || <Info className="h-3 w-3" />;
  };

  const getLevelColor = (level: LogLevel) => {
    const colors = {
      [LogLevel.INFO]: 'bg-blue-100 text-blue-800 border-blue-200',
      [LogLevel.SUCCESS]: 'bg-green-100 text-green-800 border-green-200',
      [LogLevel.WARNING]: 'bg-orange-100 text-orange-800 border-orange-200',
      [LogLevel.ERROR]: 'bg-red-100 text-red-800 border-red-200',
      [LogLevel.DEBUG]: 'bg-purple-100 text-purple-800 border-purple-200',
      [LogLevel.API]: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      [LogLevel.STATE]: 'bg-lime-100 text-lime-800 border-lime-200',
      [LogLevel.FILTER]: 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colors[level] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const exportLogs = () => {
    const dataStr = logger.exportLogs();
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dev-console-logs-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Debug: Component rendering (removed console.log to prevent infinite re-renders)
  
  if (!isOwner) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
          <p className="text-muted-foreground">
            This developer console is only available to owners.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Debug: isOwner = {isOwner.toString()}, logs = {logs.length}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-dev-console-active>
      <Card className="border-2 border-gradient-to-r from-purple-500/20 to-blue-500/20 bg-gradient-to-br from-background via-background to-purple-50/5 dark:to-purple-950/5 shadow-2xl">
        <CardHeader className="bg-gradient-to-r from-purple-600/10 to-blue-600/10 border-b border-purple-200/20 dark:border-purple-800/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent flex items-center gap-2">
                <Terminal className="h-6 w-6 text-purple-600" />
                Developer Console
              </CardTitle>
              <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Real-time debugging and API testing for owners
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800">
                {logs.length} logs
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => logger.clearLogs()}
                className="flex items-center gap-2 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:border-red-800 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportLogs}
                className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-900/20 dark:hover:border-blue-800 transition-colors"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="logs" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-muted/50 border border-border/50 shadow-inner">
              <TabsTrigger value="logs" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700 dark:data-[state=active]:bg-purple-900/20 dark:data-[state=active]:text-purple-300 transition-all duration-200">
                <Terminal className="h-4 w-4 mr-2" />
                Console Logs
              </TabsTrigger>
              <TabsTrigger value="api-test" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/20 dark:data-[state=active]:text-blue-300 transition-all duration-200">
                <Bug className="h-4 w-4 mr-2" />
                API Tests
              </TabsTrigger>
              <TabsTrigger value="debug" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700 dark:data-[state=active]:bg-orange-900/20 dark:data-[state=active]:text-orange-300 transition-all duration-200">
                <Filter className="h-4 w-4 mr-2" />
                Debug Tools
              </TabsTrigger>
              <TabsTrigger value="stats" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700 dark:data-[state=active]:bg-green-900/20 dark:data-[state=active]:text-green-300 transition-all duration-200">
                <CheckCircle className="h-4 w-4 mr-2" />
                Statistics
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="logs" className="space-y-4">
              {/* Filters */}
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-muted/30 to-muted/10 rounded-lg border border-border/50">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-purple-600" />
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value as LogLevel | 'all')}
                    className="px-3 py-2 border border-border/50 rounded-md text-sm bg-background hover:border-purple-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800 transition-all duration-200"
                  >
                    <option value="all">All Levels</option>
                    <option value={LogLevel.INFO}>Info</option>
                    <option value={LogLevel.SUCCESS}>Success</option>
                    <option value={LogLevel.WARNING}>Warning</option>
                    <option value={LogLevel.ERROR}>Error</option>
                    <option value={LogLevel.DEBUG}>Debug</option>
                    <option value={LogLevel.API}>API</option>
                    <option value={LogLevel.STATE}>State</option>
                    <option value={LogLevel.FILTER}>Filter</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-blue-600" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-3 py-2 border border-border/50 rounded-md text-sm bg-background hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all duration-200 min-w-[200px]"
                  />
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={`flex items-center gap-2 transition-all duration-200 ${
                    autoScroll 
                      ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300' 
                      : 'hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 dark:hover:bg-orange-900/20 dark:hover:border-orange-800 dark:hover:text-orange-300'
                  }`}
                >
                  {autoScroll ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  Auto Scroll
                </Button>
              </div>

              {/* Logs Display */}
              <Card className="border border-border/50 shadow-lg">
                <CardHeader className="pb-3 bg-gradient-to-r from-muted/20 to-muted/10 border-b border-border/30">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-purple-600" />
                      Logs ({filteredLogs.length}/{logs.length})
                    </CardTitle>
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                      {new Date().toLocaleTimeString()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea ref={scrollAreaRef} className="h-96 bg-gradient-to-b from-background to-muted/5">
                    <div className="p-4 space-y-3">
                      {filteredLogs.length === 0 ? (
                        <div className="text-center text-muted-foreground py-12">
                          <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium">No logs found</p>
                          <p className="text-sm">Try adjusting your filters or generate some test logs</p>
                        </div>
                      ) : (
                        filteredLogs.map((log, index) => (
                          <div
                            key={index}
                            className={`group flex items-start gap-3 p-3 rounded-lg border-l-4 transition-all duration-200 hover:shadow-md hover:scale-[1.01] ${
                              log.level === LogLevel.ERROR 
                                ? 'border-l-red-500 bg-red-50/50 dark:bg-red-950/10 hover:bg-red-50 dark:hover:bg-red-950/20' 
                                : log.level === LogLevel.WARNING
                                ? 'border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/10 hover:bg-orange-50 dark:hover:bg-orange-950/20'
                                : log.level === LogLevel.SUCCESS
                                ? 'border-l-green-500 bg-green-50/50 dark:bg-green-950/10 hover:bg-green-50 dark:hover:bg-green-950/20'
                                : log.level === LogLevel.API
                                ? 'border-l-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/10 hover:bg-cyan-50 dark:hover:bg-cyan-950/20'
                                : 'border-l-gray-300 bg-gray-50/50 dark:bg-gray-950/10 hover:bg-gray-50 dark:hover:bg-gray-950/20'
                            }`}
                          >
                            <div className="flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-200">
                              {getLevelIcon(log.level)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge
                                  variant="outline"
                                  className={`text-xs font-semibold shadow-sm ${getLevelColor(log.level)}`}
                                >
                                  {log.level.toUpperCase()}
                                </Badge>
                                <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
                                  {log.timestamp}
                                </span>
                                <span className="text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded">
                                  {log.category}
                                </span>
                              </div>
                              <div className="text-sm text-foreground font-mono leading-relaxed bg-background/50 p-2 rounded border border-border/30">
                                {log.message}
                              </div>
                              {log.data && (
                                <div className="mt-2">
                                  <pre className="text-xs bg-muted/80 dark:bg-muted/60 p-3 rounded-lg overflow-x-auto border border-border/30 font-mono leading-relaxed">
                                    {JSON.stringify(log.data, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="api-test" className="space-y-4">
              <TestAPIDebug />
              <Separator />
              <DebugAPITest />
            </TabsContent>
            
            <TabsContent value="debug" className="space-y-4">
              <Card className="border border-border/50 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-orange-600/10 to-orange-600/5 border-b border-orange-200/20 dark:border-orange-800/20">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Filter className="h-4 w-4 text-orange-600" />
                    Debug Tools
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        logger.info('Debug', 'Test info log');
                        logger.success('Debug', 'Test success log');
                        logger.warning('Debug', 'Test warning log');
                        logger.error('Debug', 'Test error log');
                      }}
                      className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-purple-50 hover:border-purple-200 dark:hover:bg-purple-900/20 dark:hover:border-purple-800 transition-all duration-200"
                    >
                      <Info className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">Test Logs</span>
                      <span className="text-xs text-muted-foreground">Generate sample log entries</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        logger.api('PlayerPropsTab', 'Testing API debugging logs');
                        logger.api('SportsDataIO-Fixed', 'Sample API call: Getting NFL props');
                        logger.api('SportsDataIO-Fixed', 'Sample API response: 1301 props received');
                        logger.api('PlayerPropsTab', 'Sample prop data:', {
                          playerName: 'Josh Allen',
                          line: 37,
                          overOdds: -202,
                          underOdds: -175
                        });
                        logger.success('PlayerPropsTab', 'API test logs generated successfully');
                      }}
                      className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-900/20 dark:hover:border-blue-800 transition-all duration-200"
                    >
                      <Bug className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Test API Logs</span>
                      <span className="text-xs text-muted-foreground">Generate API debugging logs</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        localStorage.clear();
                        logger.info('Debug', 'Local storage cleared');
                      }}
                      className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:border-red-800 transition-all duration-200"
                    >
                      <Trash2 className="h-5 w-5 text-red-600" />
                      <span className="font-medium">Clear Storage</span>
                      <span className="text-xs text-muted-foreground">Clear localStorage data</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        logger.state('PlayerPropsTab', 'Testing state changes');
                        logger.filter('PlayerPropsTab', 'Testing filter operations');
                        logger.debug('PlayerPropsTab', 'Testing debug operations');
                      }}
                      className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-green-50 hover:border-green-200 dark:hover:bg-green-900/20 dark:hover:border-green-800 transition-all duration-200"
                    >
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Test All Types</span>
                      <span className="text-xs text-muted-foreground">Generate all log types</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="stats" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border border-border/50 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-green-600/10 to-green-600/5 border-b border-green-200/20 dark:border-green-800/20">
                    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Log Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-muted/30 to-muted/10 rounded-lg border border-border/30">
                        <span className="font-medium">Total Logs</span>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                          {logs.length}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.values(LogLevel).map((level) => {
                          const count = logs.filter(l => l.level === level).length;
                          const percentage = logs.length > 0 ? Math.round((count / logs.length) * 100) : 0;
                          return (
                            <div key={level} className="flex items-center justify-between p-2 rounded border border-border/30 bg-muted/20">
                              <div className="flex items-center gap-2">
                                {getLevelIcon(level)}
                                <span className="text-xs font-medium capitalize">{level}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{percentage}%</span>
                                <Badge variant="outline" className="text-xs">
                                  {count}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border border-border/50 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-purple-600/10 to-purple-600/5 border-b border-purple-200/20 dark:border-purple-800/20">
                    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Activity className="h-4 w-4 text-purple-600" />
                      API Usage Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <>

                            {/* SportsGameOdds API */}
                            <div className="p-3 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/10 rounded-lg border border-purple-200 dark:border-purple-800">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-purple-800 dark:text-purple-200">SportsGameOdds API</span>
                                <div className="flex gap-2">
                                  <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700">
                                    {sportsGameOddsAPI.getUsageStats().callsToday} calls today
                                  </Badge>
                                  {sportsGameOddsAPI.getUsageStats().isNearLimit && (
                                    <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700">
                                      Near Limit
                                    </Badge>
                                  )}
                                  {sportsGameOddsAPI.getUsageStats().isAtLimit && (
                                    <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700">
                                      At Limit
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                  <span className="text-purple-700 dark:text-purple-300">Usage:</span>
                                  <span className="font-semibold">
                                    {sportsGameOddsAPI.getUsageStats().callsToday} / {sportsGameOddsAPI.getUsageStats().maxDailyCalls}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                      sportsGameOddsAPI.getUsageStats().isAtLimit 
                                        ? 'bg-red-500' 
                                        : sportsGameOddsAPI.getUsageStats().isNearLimit 
                                        ? 'bg-orange-500' 
                                        : 'bg-purple-500'
                                    }`}
                                    style={{ width: `${Math.min(sportsGameOddsAPI.getUsageStats().usagePercentage, 100)}%` }}
                                  ></div>
                                </div>
                                <div className="text-xs text-purple-600 dark:text-purple-400">
                                  {sportsGameOddsAPI.getUsageStats().usagePercentage}% of daily limit
                                </div>
                                <div className="text-xs text-purple-600 dark:text-purple-400">
                                  Total calls: {sportsGameOddsAPI.getUsageStats().totalCalls}
                                </div>
                                <div className="text-xs text-purple-600 dark:text-purple-400">
                                  Cache hit rate: {Math.round(sportsGameOddsAPI.getDetailedUsageStats().cacheHitRate * 100)}%
                                </div>
                              </div>
                            </div>

                            {/* Detailed SportsGameOdds Usage */}
                            {sportsGameOddsAPI.getUsageStats().callsToday > 0 && (
                              <div className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/10 rounded-lg border border-gray-200 dark:border-gray-800">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-semibold text-gray-800 dark:text-gray-200">Top Endpoints</span>
                                  <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-700">
                                    {sportsGameOddsAPI.getDetailedUsageStats().topEndpoints.length} tracked
                                  </Badge>
                                </div>
                                <div className="space-y-1">
                                  {sportsGameOddsAPI.getDetailedUsageStats().topEndpoints.map((endpoint, index) => (
                                    <div key={index} className="flex justify-between text-xs">
                                      <span className="text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                                        {endpoint.endpoint}
                                      </span>
                                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                                        {endpoint.count} calls
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                {sportsGameOddsAPI.getDetailedUsageStats().recommendations.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Recommendations:</div>
                                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                      {sportsGameOddsAPI.getDetailedUsageStats().recommendations.map((rec, index) => (
                                        <li key={index} className="flex items-start gap-1">
                                          <span className="text-orange-500">•</span>
                                          <span>{rec}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                sportsGameOddsAPI.resetUsageStats();
                                logger.info('DevConsole', 'SportsGameOdds API usage statistics reset');
                              }}
                              className="w-full text-xs"
                            >
                              Reset Usage Stats
                            </Button>
                      </>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border border-border/50 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-blue-600/10 to-blue-600/5 border-b border-blue-200/20 dark:border-blue-800/20">
                    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-600" />
                      System Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="p-3 bg-gradient-to-r from-muted/30 to-muted/10 rounded-lg border border-border/30">
                        <div className="text-xs font-medium text-muted-foreground mb-1">User Agent</div>
                        <div className="text-sm font-mono break-all">{navigator.userAgent.slice(0, 60)}...</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 rounded border border-border/30 bg-muted/20 text-center">
                          <div className="text-xs text-muted-foreground">Screen</div>
                          <div className="text-sm font-semibold">{window.screen.width}×{window.screen.height}</div>
                        </div>
                        <div className="p-2 rounded border border-border/30 bg-muted/20 text-center">
                          <div className="text-xs text-muted-foreground">Viewport</div>
                          <div className="text-sm font-semibold">{window.innerWidth}×{window.innerHeight}</div>
                        </div>
                        <div className="p-2 rounded border border-border/30 bg-muted/20 text-center">
                          <div className="text-xs text-muted-foreground">Online</div>
                          <div className={`text-sm font-semibold ${navigator.onLine ? 'text-green-600' : 'text-red-600'}`}>
                            {navigator.onLine ? 'Yes' : 'No'}
                          </div>
                        </div>
                        <div className="p-2 rounded border border-border/30 bg-muted/20 text-center">
                          <div className="text-xs text-muted-foreground">Language</div>
                          <div className="text-sm font-semibold">{navigator.language}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
