import React, { useState } from 'react';

interface TestResult {
  timestamp: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const AuthTest: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const log = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const result: TestResult = {
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    };
    setResults(prev => [...prev, result]);
    console.log(message);
  };

  const clearResults = () => {
    setResults([]);
  };

  const testConnectivity = async () => {
    log('Testing API connectivity...', 'info');
    
    try {
      const response = await fetch('http://localhost:3001/health', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        log(`✅ Connectivity: SUCCESS (${response.status})`, 'success');
        log(`Response: ${JSON.stringify(data)}`, 'info');
        return true;
      } else {
        log(`❌ Connectivity: HTTP ${response.status}`, 'error');
        return false;
      }
      
    } catch (error: any) {
      log(`❌ Connectivity: ERROR - ${error.message}`, 'error');
      return false;
    }
  };

  const testSignup = async () => {
    log('Testing signup endpoint...', 'info');
    
    try {
      const response = await fetch('http://localhost:3001/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: `test-${Date.now()}@example.com`,
          password: 'password123',
          displayName: 'Test User'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          log('✅ Signup: SUCCESS', 'success');
          log(`Token: ${data.data.token.substring(0, 50)}...`, 'info');
          return data.data.token;
        } else {
          log(`❌ Signup: FAILED - ${data.error}`, 'error');
          return null;
        }
      } else {
        const errorText = await response.text();
        log(`❌ Signup: HTTP ${response.status} - ${errorText}`, 'error');
        return null;
      }
      
    } catch (error: any) {
      log(`❌ Signup: ERROR - ${error.message}`, 'error');
      return null;
    }
  };

  const testMeEndpoint = async (token: string) => {
    if (!token) {
      log('❌ No token available for /me test', 'error');
      return false;
    }

    log('Testing /me endpoint...', 'info');
    
    try {
      const response = await fetch('http://localhost:3001/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          log('✅ /me Endpoint: SUCCESS', 'success');
          log(`User ID: ${data.data.id}`, 'info');
          log(`Email: ${data.data.email}`, 'info');
          return true;
        } else {
          log(`❌ /me Endpoint: FAILED - ${data.error}`, 'error');
          return false;
        }
      } else {
        const errorText = await response.text();
        log(`❌ /me Endpoint: HTTP ${response.status} - ${errorText}`, 'error');
        return false;
      }
      
    } catch (error: any) {
      log(`❌ /me Endpoint: ERROR - ${error.message}`, 'error');
      return false;
    }
  };

  const runAllTests = async () => {
    setIsLoading(true);
    clearResults();
    log('🚀 Starting Authentication Test Suite...', 'info');
    
    try {
      // Test 1: Basic connectivity
      const connectivityOk = await testConnectivity();
      if (!connectivityOk) {
        log('❌ Basic connectivity failed. Stopping tests.', 'error');
        setIsLoading(false);
        return;
      }
      
      // Test 2: Signup
      const token = await testSignup();
      if (!token) {
        log('❌ Signup failed. Stopping tests.', 'error');
        setIsLoading(false);
        return;
      }
      
      // Test 3: /me endpoint
      const meOk = await testMeEndpoint(token);
      
      // Summary
      const tests = [connectivityOk, !!token, meOk];
      const passed = tests.filter(Boolean).length;
      const total = tests.length;
      
      if (passed === total) {
        log(`🎉 ALL TESTS PASSED! (${passed}/${total})`, 'success');
        log('Your authentication system is fully functional!', 'success');
      } else {
        log(`⚠️ SOME TESTS FAILED (${passed}/${total})`, 'error');
      }
      
    } catch (error: any) {
      log(`❌ Test suite error: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const testConnectivityOnly = async () => {
    setIsLoading(true);
    clearResults();
    await testConnectivity();
    setIsLoading(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🔐 Authentication Test Suite</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <p><strong>API Server:</strong> http://localhost:3001</p>
        <p><strong>Frontend:</strong> http://localhost:8083</p>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testConnectivityOnly}
          disabled={isLoading}
          style={{ 
            padding: '10px 20px', 
            margin: '5px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? 'Testing...' : 'Test Connectivity Only'}
        </button>
        
        <button 
          onClick={runAllTests}
          disabled={isLoading}
          style={{ 
            padding: '10px 20px', 
            margin: '5px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? 'Running Tests...' : 'Run Full Test Suite'}
        </button>
        
        <button 
          onClick={clearResults}
          disabled={isLoading}
          style={{ 
            padding: '10px 20px', 
            margin: '5px', 
            backgroundColor: '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clear Results
        </button>
      </div>
      
      <div style={{ 
        maxHeight: '400px', 
        overflowY: 'auto', 
        border: '1px solid #ddd', 
        borderRadius: '4px',
        padding: '10px',
        backgroundColor: '#f8f9fa'
      }}>
        {results.map((result, index) => (
          <div 
            key={index}
            style={{ 
              margin: '5px 0',
              padding: '8px',
              borderRadius: '4px',
              backgroundColor: 
                result.type === 'success' ? '#d4edda' :
                result.type === 'error' ? '#f8d7da' : '#d1ecf1',
              border: 
                result.type === 'success' ? '1px solid #c3e6cb' :
                result.type === 'error' ? '1px solid #f5c6cb' : '1px solid #bee5eb'
            }}
          >
            <strong>[{result.timestamp}]</strong> {result.message}
          </div>
        ))}
        
        {results.length === 0 && (
          <div style={{ color: '#6c757d', fontStyle: 'italic' }}>
            No test results yet. Click a button above to start testing.
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthTest;
