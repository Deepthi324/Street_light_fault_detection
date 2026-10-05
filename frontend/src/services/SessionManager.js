class SessionManager {
  static SESSION_KEY = 'street_light_session';
  static SESSION_EXPIRY_HOURS = 24;

  static saveSession(userData) {
    const sessionData = {
      user: userData,
      loginTime: new Date().toISOString(),
      expiryTime: new Date(Date.now() + this.SESSION_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()
    };

    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
  }

  static getSession() {
    try {
      const sessionData = sessionStorage.getItem(this.SESSION_KEY);
      if (!sessionData) return null;

      const session = JSON.parse(sessionData);

      // Check if session has expired
      if (new Date() > new Date(session.expiryTime)) {
        this.clearSession();
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error parsing session data:', error);
      this.clearSession();
      return null;
    }
  }

  static clearSession() {
    sessionStorage.removeItem(this.SESSION_KEY);
  }

  static isSessionValid() {
    const session = this.getSession();
    return session !== null;
  }

  static getCurrentUser() {
    const session = this.getSession();
    return session ? session.user : null;
  }

  static refreshSession() {
    const session = this.getSession();
    if (session) {
      this.saveSession(session.user);
    }
  }
}

export default SessionManager;
