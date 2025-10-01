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
  Bug
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

    // Intercept console logs
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;
    const originalConsoleInfo = console.info;
    const originalConsoleDebug = console.debug;

    const addLog = (level: LogLevel, message: string, category: string = 'Console', data?: any) => {
      const newLog: LogEntry = {
        timestamp: new Date().toLocaleTimeString('en-US', { 
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          fractionalSecondDigits: 3
        }),
        level,
        category,
        message,
        data
      };
      setLogs(prev => [...prev.slice(-999), newLog]); // Keep last 1000 logs
    };

    console.log = (...args: any[]) => {
      originalConsoleLog(...args);
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
      addLog('info', message, 'Console');
    };

    console.warn = (...args: any[]) => {
      originalConsoleWarn(...args);
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
      addLog('warning', message, 'Console');
    };

    console.error = (...args: any[]) => {
      originalConsoleError(...args);
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
      addLog('error', message, 'Console');
    };

    console.info = (...args: any[]) => {
      originalConsoleInfo(...args);
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
      addLog('info', message, 'Console');
    };

    console.debug = (...args: any[]) => {
      originalConsoleDebug(...args);
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
      addLog('debug', message, 'Console');
    };

    // Add initial log
    addLog('info', 'Dev Console initialized - Console interception active', 'DevConsole');
    
    // Test the logger
    logger.info('DevConsole', 'Dev Console component mounted and ready');
    logger.success('DevConsole', 'Console interception is now active');
    logger.warning('DevConsole', 'All console logs will now appear in this Dev Console');

    // Update logs every second to get logger's logs
    const interval = setInterval(() => {
      const loggerLogs = logger.getLogs();
      // Only update if there are new logs to prevent infinite re-renders
      setLogs(prevLogs => {
        // Check if we have new logs
        const hasNewLogs = loggerLogs.some(log => 
          !prevLogs.some(prevLog => 
            prevLog.timestamp === log.timestamp && 
            prevLog.message === log.message && 
            prevLog.category === log.category
          )
        );
        
        if (!hasNewLogs) {
          return prevLogs; // No new logs, don't update state
        }
        
        // Merge logger logs with console interception logs
        const allLogs = [...prevLogs, ...loggerLogs];
        // Remove duplicates and sort by timestamp
        const uniqueLogs = allLogs.filter((log, index, self) => 
          index === self.findIndex(l => l.timestamp === log.timestamp && l.message === log.message && l.category === log.category)
        ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        return uniqueLogs.slice(-1000); // Keep last 1000 logs
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      console.log = originalConsoleLog;
      console.warn = originalConsoleWarn;
      console.error = originalConsoleError;
      console.info = originalConsoleInfo;
      console.debug = originalConsoleDebug;
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
    <div className="space-y-6">
      <Card className="border-purple-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-purple-600 flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Dev Console
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => logger.clearLogs()}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportLogs}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="logs" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="logs">Console Logs</TabsTrigger>
              <TabsTrigger value="api-test">API Tests</TabsTrigger>
              <TabsTrigger value="debug">Debug Tools</TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="logs" className="space-y-4">
              {/* Filters */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value as LogLevel | 'all')}
                    className="px-2 py-1 border rounded text-sm"
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
                  <Search className="h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-2 py-1 border rounded text-sm"
                  />
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAutoScroll(!autoScroll)}
                  className="flex items-center gap-2"
                >
                  {autoScroll ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  Auto Scroll
                </Button>
              </div>

              {/* Logs Display */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      Logs ({filteredLogs.length}/{logs.length})
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {new Date().toLocaleTimeString()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea ref={scrollAreaRef} className="h-96">
                    <div className="p-4 space-y-2">
                      {filteredLogs.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          No logs found
                        </div>
                      ) : (
                        filteredLogs.map((log, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-2 rounded border-l-2 border-l-gray-200 hover:bg-gray-50"
                          >
                            <div className="flex-shrink-0 mt-0.5">
                              {getLevelIcon(log.level)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${getLevelColor(log.level)}`}
                                >
                                  {log.level.toUpperCase()}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {log.timestamp}
                                </span>
                                <span className="text-xs font-medium text-blue-600">
                                  {log.category}
                                </span>
                              </div>
                              <div className="text-sm text-gray-900 font-mono">
                                {log.message}
                              </div>
                              {log.data && (
                                <div className="mt-1">
                                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
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
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Debug Tools</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        logger.info('Debug', 'Test info log');
                        logger.success('Debug', 'Test success log');
                        logger.warning('Debug', 'Test warning log');
                        logger.error('Debug', 'Test error log');
                      }}
                    >
                      Test Logs
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
                    >
                      Test API Logs
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        localStorage.clear();
                        logger.info('Debug', 'Local storage cleared');
                      }}
                    >
                      Clear Storage
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="stats" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Log Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div>Total Logs: {logs.length}</div>
                      <div>Info: {logs.filter(l => l.level === LogLevel.INFO).length}</div>
                      <div>Success: {logs.filter(l => l.level === LogLevel.SUCCESS).length}</div>
                      <div>Warning: {logs.filter(l => l.level === LogLevel.WARNING).length}</div>
                      <div>Error: {logs.filter(l => l.level === LogLevel.ERROR).length}</div>
                      <div>Debug: {logs.filter(l => l.level === LogLevel.DEBUG).length}</div>
                      <div>API: {logs.filter(l => l.level === LogLevel.API).length}</div>
                      <div>State: {logs.filter(l => l.level === LogLevel.STATE).length}</div>
                      <div>Filter: {logs.filter(l => l.level === LogLevel.FILTER).length}</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">System Info</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div>User Agent: {navigator.userAgent.slice(0, 50)}...</div>
                      <div>Screen: {window.screen.width}x{window.screen.height}</div>
                      <div>Viewport: {window.innerWidth}x{window.innerHeight}</div>
                      <div>Online: {navigator.onLine ? 'Yes' : 'No'}</div>
                      <div>Language: {navigator.language}</div>
                      <div>Platform: {navigator.platform}</div>
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
