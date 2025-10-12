// Frontend integration for StatPedia with Cloudflare Workers
// This file shows how to integrate with Lovable frontend

// Configuration
const CONFIG = {
  authEndpoint: 'https://auth.statpedia.com',
  storageEndpoint: 'https://storage.statpedia.com',
  graphqlEndpoint: 'https://api.statpedia.com/v1/graphql',
  hasuraEndpoint: 'https://graphql-engine-latest-statpedia.onrender.com/v1/graphql'
};

// Authentication service
class AuthService {
  constructor() {
    this.token = localStorage.getItem('statpedia_token');
  }

  async signup(email, password, displayName) {
    const response = await fetch(`${CONFIG.authEndpoint}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, displayName }),
    });

    const data = await response.json();
    if (response.ok) {
      this.token = data.token;
      localStorage.setItem('statpedia_token', this.token);
    }
    return data;
  }

  async login(email, password) {
    const response = await fetch(`${CONFIG.authEndpoint}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (response.ok) {
      this.token = data.token;
      localStorage.setItem('statpedia_token', this.token);
    }
    return data;
  }

  async logout() {
    if (this.token) {
      await fetch(`${CONFIG.authEndpoint}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });
    }
    this.token = null;
    localStorage.removeItem('statpedia_token');
  }

  async getCurrentUser() {
    if (!this.token) return null;

    const response = await fetch(`${CONFIG.authEndpoint}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    if (response.ok) {
      return response.json();
    }
    return null;
  }

  isAuthenticated() {
    return !!this.token;
  }

  getAuthHeaders() {
    return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
  }
}

// GraphQL client
class GraphQLClient {
  constructor(authService) {
    this.authService = authService;
  }

  async query(query, variables = {}) {
    const response = await fetch(CONFIG.graphqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.authService.getAuthHeaders(),
      },
      body: JSON.stringify({ query, variables }),
    });

    return response.json();
  }

  async mutation(mutation, variables = {}) {
    return this.query(mutation, variables);
  }
}

// File storage service
class StorageService {
  constructor(authService) {
    this.authService = authService;
  }

  async uploadFile(file, key = null) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${CONFIG.storageEndpoint}/${key || ''}`, {
      method: 'POST',
      headers: {
        ...this.authService.getAuthHeaders(),
      },
      body: formData,
    });

    return response.json();
  }

  async deleteFile(key) {
    const response = await fetch(`${CONFIG.storageEndpoint}/${key}`, {
      method: 'DELETE',
      headers: {
        ...this.authService.getAuthHeaders(),
      },
    });

    return response.json();
  }

  getFileUrl(key) {
    return `${CONFIG.storageEndpoint}/${key}`;
  }
}

// React hooks for Lovable integration
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const authService = useMemo(() => new AuthService(), []);

  useEffect(() => {
    const initAuth = async () => {
      if (authService.isAuthenticated()) {
        const userData = await authService.getCurrentUser();
        setUser(userData?.user || null);
      }
      setLoading(false);
    };

    initAuth();
  }, [authService]);

  const signup = async (email, password, displayName) => {
    const result = await authService.signup(email, password, displayName);
    if (result.user) {
      setUser(result.user);
    }
    return result;
  };

  const login = async (email, password) => {
    const result = await authService.login(email, password);
    if (result.user) {
      setUser(result.user);
    }
    return result;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return {
    user,
    loading,
    signup,
    login,
    logout,
    isAuthenticated: authService.isAuthenticated(),
  };
};

export const useGraphQL = () => {
  const authService = useMemo(() => new AuthService(), []);
  const graphqlClient = useMemo(() => new GraphQLClient(authService), [authService]);

  const query = useCallback(async (query, variables) => {
    return graphqlClient.query(query, variables);
  }, [graphqlClient]);

  const mutation = useCallback(async (mutation, variables) => {
    return graphqlClient.mutation(mutation, variables);
  }, [graphqlClient]);

  return { query, mutation };
};

export const useStorage = () => {
  const authService = useMemo(() => new AuthService(), []);
  const storageService = useMemo(() => new StorageService(authService), [authService]);

  const uploadFile = useCallback(async (file, key) => {
    return storageService.uploadFile(file, key);
  }, [storageService]);

  const deleteFile = useCallback(async (key) => {
    return storageService.deleteFile(key);
  }, [storageService]);

  const getFileUrl = useCallback((key) => {
    return storageService.getFileUrl(key);
  }, [storageService]);

  return { uploadFile, deleteFile, getFileUrl };
};

// Example React components
export const LoginForm = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.error) {
        alert(result.error);
      }
    } catch (error) {
      alert('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};

export const PlayerImageUpload = ({ playerId }) => {
  const { uploadFile } = useStorage();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    try {
      const result = await uploadFile(file, `players/${playerId}/headshot`);
      if (result.success) {
        alert('Image uploaded successfully!');
      }
    } catch (error) {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <button onClick={handleUpload} disabled={!file || uploading}>
        {uploading ? 'Uploading...' : 'Upload Image'}
      </button>
    </div>
  );
};

export const GraphQLQuery = ({ query, variables }) => {
  const { query: graphqlQuery } = useGraphQL();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await graphqlQuery(query, variables);
        if (result.errors) {
          setError(result.errors[0].message);
        } else {
          setData(result.data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (query) {
      fetchData();
    }
  }, [query, variables, graphqlQuery]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return null;

  return <pre>{JSON.stringify(data, null, 2)}</pre>;
};

// Export services for direct use
export { AuthService, GraphQLClient, StorageService };
export default { AuthService, GraphQLClient, StorageService };
