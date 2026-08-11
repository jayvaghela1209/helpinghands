const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Common request wrapper
 */
async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    
    if (response.status === 204) {
      return null;
    }
    
    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
  const detail = data.detail;

  if (typeof detail === 'object' && detail !== null) {
    const message =
      detail.detail ||
      `Distance: ${detail.distance} m, Allowed: ${detail.allowed_radius} m`;

    throw new Error(message);
  }

  throw new Error(
    detail || `HTTP Error ${response.status}: ${response.statusText}`
  );
}
    return data;
  } catch (error) {
    console.error(`API service error on ${endpoint}:`, error);
    throw error;
  }
}

function getAuthToken(token) {
  if (token) return token;
  const localAuthToken = localStorage.getItem('authToken');
  if (localAuthToken) return localAuthToken;
  try {
    const session = JSON.parse(localStorage.getItem('hh_session') || 'null');
    return session?.access_token || null;
  } catch (_) {
    return null;
  }
}

export const api = {
  /**
   * Health check endpoint
   */
  async checkHealth() {
    return request('/health');
  },

  /**
   * Standard GET request
   */
  async get(endpoint, token = null) {
    const headers = {};
    const finalToken = getAuthToken(token);
    if (finalToken) {
      headers['Authorization'] = `Bearer ${finalToken}`;
    }
    return request(endpoint, { method: 'GET', headers });
  },

  /**
   * Standard POST request
   */
  async post(endpoint, body, token = null) {
    const headers = {};
    const finalToken = getAuthToken(token);
    if (finalToken) {
      headers['Authorization'] = `Bearer ${finalToken}`;
    }
    return request(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  },

  /**
   * Standard PUT request
   */
  async put(endpoint, body, token = null) {
    const headers = {};
    const finalToken = getAuthToken(token);
    if (finalToken) {
      headers['Authorization'] = `Bearer ${finalToken}`;
    }
    return request(endpoint, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
  },

  /**
   * Standard DELETE request
   */
  async delete(endpoint, token = null) {
    const headers = {};
    const finalToken = getAuthToken(token);
    if (finalToken) {
      headers['Authorization'] = `Bearer ${finalToken}`;
    }
    return request(endpoint, { method: 'DELETE', headers });
  }
};

export default api;
