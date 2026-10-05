// Authentication API service – backend at http://localhost:4003
const API_BASE_URL = 'http://localhost:4003/api';
const TOKEN_KEY = 'auth_token';

async function authFetch(path, body) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error(e.message || 'Cannot reach server. Is the backend running on port 4003?');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

class AuthService {
  static async signup(userData) {
    const payload = {
      fullName: userData.fullName || userData.name,
      email: userData.email,
      password: userData.password,
      confirmPassword: userData.confirmPassword,
      phone: userData.phone,
      role: userData.role || 'citizen',
    };
    return authFetch('/auth/signup', payload);
  }

  static async register(userData) {
    const payload = {
      name: userData.name || userData.fullName,
      email: userData.email,
      password: userData.password,
      role: userData.role || 'citizen',
    };
    return authFetch('/auth/register', payload);
  }

  static async login(credentials) {
    const data = await authFetch('/auth/login', {
      email: credentials.email,
      password: credentials.password,
    });
    if (data.token) sessionStorage.setItem(TOKEN_KEY, data.token);
    if (data.data) this.storeSession(data.data);
    return data;
  }

  static getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  static storeSession(userData) {
    sessionStorage.setItem('user', JSON.stringify(userData));
  }

  // Get current user session
  static getCurrentUser() {
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  }

  static clearSession() {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem(TOKEN_KEY);
  }

  // Check if user is authenticated
  static isAuthenticated() {
    const user = this.getCurrentUser();
    return user !== null;
  }

  // Get user role
  static getUserRole() {
    const user = this.getCurrentUser();
    return user ? user.role : null;
  }

  // Check if user has specific role
  static hasRole(requiredRole) {
    const userRole = this.getUserRole();
    return userRole === requiredRole;
  }

  // Check if user can access authority features
  static isAuthority() {
    return this.hasRole('authority');
  }

  // Check if user can access maintenance features
  static isMaintenance() {
    return this.hasRole('maintenance');
  }

  // Check if user is citizen
  static isCitizen() {
    return this.hasRole('citizen');
  }
}

export default AuthService;
