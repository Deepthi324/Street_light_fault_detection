const BASE_URL = "http://localhost:4003";
const TOKEN_KEY = "street_light_token";
const USER_KEY = "street_light_user";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuth(token, user) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch (_) { }
}

export function getStoredUser() {
  try {
    const s = localStorage.getItem(USER_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export function clearAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (_) { }
}

async function api(path, opts = {}) {
  const { method = "GET", body, headers: h = {} } = opts;
  const headers = { "Content-Type": "application/json", ...h };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined
    });
  } catch (e) {
    throw new Error(e && e.message ? e.message : "Cannot reach server. Is the backend running on port 4002?");
  }
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    if (res.status === 401) {
      clearAuth();
      try { window.dispatchEvent(new CustomEvent("auth:401")); } catch (_) { }
    }
    const msg = (data && data.message) || data?.error || `Request failed: ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  if (res.status === 204) return null;
  return data;
}

export const auth = {
  async login(body) {
    return api("/api/auth/login", { method: "POST", body });
  },
  async signup(body) {
    return api("/api/auth/signup", { method: "POST", body });
  }
};

export async function fetchLightPoles() {
  return api("/api/light-poles");
}

export async function fetchLightPole(id) {
  return api(`/api/light-poles/${id}`);
}

export async function createLightPole(data) {
  return api("/api/light-poles", { method: "POST", body: data });
}

export async function updateLightPole(id, data) {
  return api(`/api/light-poles/${id}`, { method: "PUT", body: data });
}

export async function deleteLightPole(id) {
  return api(`/api/light-poles/${id}`, { method: "DELETE" });
}

export async function fetchIncidents() {
  return api("/api/incidents");
}

export async function fetchIncident(id) {
  return api(`/api/incidents/${id}`);
}

export async function createIncident(data) {
  return api("/api/incidents", { method: "POST", body: data });
}

export async function updateIncident(id, data) {
  return api(`/api/incidents/${id}`, { method: "PUT", body: data });
}

export async function deleteIncident(id) {
  return api(`/api/incidents/${id}`, { method: "DELETE" });
}

export async function fetchComplaints() {
  return api("/api/complaints");
}

export async function fetchComplaint(id) {
  return api(`/api/complaints/${id}`);
}

export async function createComplaint(data) {
  return api("/api/complaints", { method: "POST", body: data });
}

export async function updateComplaintStatus(id, data) {
  return api(`/api/complaints/${id}/status`, { method: "PUT", body: data });
}

export async function fetchMaintenanceActivity() {
  return api("/api/maintenance-activity");
}

export async function fetchMaintenanceActivityOne(id) {
  return api(`/api/maintenance-activity/${id}`);
}

export async function fetchMaintenanceActivityHistory(id) {
  return api(`/api/maintenance-activity/${id}/history`);
}

export async function createMaintenanceActivity(data) {
  return api("/api/maintenance-activity", { method: "POST", body: data });
}

export async function updateMaintenanceActivity(id, data) {
  return api(`/api/maintenance-activity/${id}`, { method: "PUT", body: data });
}

export async function deleteMaintenanceActivity(id) {
  return api(`/api/maintenance-activity/${id}`, { method: "DELETE" });
}

export async function fetchMaintenanceTeams() {
  return api("/api/maintenance-teams");
}

export async function fetchMaintenanceTeam(id) {
  return api(`/api/maintenance-teams/${id}`);
}

export async function createMaintenanceTeam(data) {
  return api("/api/maintenance-teams", { method: "POST", body: data });
}

export async function updateMaintenanceTeam(id, data) {
  return api(`/api/maintenance-teams/${id}`, { method: "PUT", body: data });
}

export async function deleteMaintenanceTeam(id) {
  return api(`/api/maintenance-teams/${id}`, { method: "DELETE" });
}

export async function fetchSensorDevices() {
  return api("/api/sensor-devices");
}

export async function fetchSensorDevice(id) {
  return api(`/api/sensor-devices/${id}`);
}

export async function createSensorDevice(data) {
  return api("/api/sensor-devices", { method: "POST", body: data });
}

export async function updateSensorDevice(id, data) {
  return api(`/api/sensor-devices/${id}`, { method: "PUT", body: data });
}

export async function deleteSensorDevice(id) {
  return api(`/api/sensor-devices/${id}`, { method: "DELETE" });
}

export async function fetchSystemUsers() {
  return api("/api/system-users");
}

export async function fetchSystemUser(id) {
  return api(`/api/system-users/${id}`);
}

export async function createSystemUser(data) {
  return api("/api/system-users", { method: "POST", body: data });
}

export async function updateSystemUser(id, data) {
  return api(`/api/system-users/${id}`, { method: "PUT", body: data });
}

export async function deleteSystemUser(id) {
  return api(`/api/system-users/${id}`, { method: "DELETE" });
}

export async function fetchPowerConsumption() {
  return api("/api/power-consumption");
}

export async function fetchPowerConsumptionOne(id) {
  return api(`/api/power-consumption/${id}`);
}

export async function createPowerConsumption(data) {
  return api("/api/power-consumption", { method: "POST", body: data });
}

export async function updatePowerConsumption(id, data) {
  return api(`/api/power-consumption/${id}`, { method: "PUT", body: data });
}

export async function deletePowerConsumption(id) {
  return api(`/api/power-consumption/${id}`, { method: "DELETE" });
}

export async function fetchNotificationLog() {
  return api("/api/notification-log");
}

export async function fetchNotificationsMe() {
  return api("/api/notifications/me");
}

export async function fetchNotificationLogOne(id) {
  return api(`/api/notification-log/${id}`);
}

export async function createNotificationLog(data) {
  return api("/api/notification-log", { method: "POST", body: data });
}

export async function updateNotificationLog(id, data) {
  return api(`/api/notification-log/${id}`, { method: "PUT", body: data });
}

export async function deleteNotificationLog(id) {
  return api(`/api/notification-log/${id}`, { method: "DELETE" });
}
