// Data Service Layer - Simulates a backend API with localStorage persistence

class DataService {
  constructor() {
    this.initStorage();
  }

  initStorage() {
    // Initialize default data if not exists
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([
        { id: 1, name: 'Admin User', email: 'admin@streetlight.com', role: 'authority', password: 'admin123' },
        { id: 2, name: 'Ravi Kumar', email: 'ravi@streetlight.com', role: 'maintenance', password: 'ravi123' },
        { id: 3, name: 'Anita Sharma', email: 'anita@streetlight.com', role: 'citizen', password: 'anita123' }
      ]));
    }

    if (!localStorage.getItem('lightPoles')) {
      localStorage.setItem('lightPoles', JSON.stringify([
        { id: 101, location: 'Main Road', latitude: 17.385044, longitude: 78.486671, status: 'Working', installDate: '2024-01-15' },
        { id: 102, location: 'Bus Stop', latitude: 17.386120, longitude: 78.487900, status: 'Faulty', installDate: '2024-01-20' },
        { id: 103, location: 'Park Area', latitude: 17.387200, longitude: 78.488500, status: 'Working', installDate: '2024-02-01' },
        { id: 104, location: 'Market Street', latitude: 17.388000, longitude: 78.489200, status: 'Maintenance', installDate: '2024-01-10' }
      ]));
    }

    if (!localStorage.getItem('incidents')) {
      localStorage.setItem('incidents', JSON.stringify([
        { id: 201, poleId: 102, issue: 'Bulb Failure', status: 'Open', reportedBy: 'Anita Sharma', reportedDate: '2024-01-25', priority: 'High' },
        { id: 202, poleId: 104, issue: 'Sensor Malfunction', status: 'In Progress', reportedBy: 'System', reportedDate: '2024-01-24', priority: 'Medium' }
      ]));
    }

    if (!localStorage.getItem('maintenanceActivities')) {
      localStorage.setItem('maintenanceActivities', JSON.stringify([
        { id: 301, incidentId: 201, staffId: 2, staffName: 'Ravi Kumar', status: 'In Progress', startDate: '2024-01-25', estimatedCompletion: '2024-01-27' },
        { id: 302, incidentId: 202, staffId: 2, staffName: 'Ravi Kumar', status: 'Scheduled', startDate: '2024-01-26', estimatedCompletion: '2024-01-28' }
      ]));
    }

    if (!localStorage.getItem('citizenComplaints')) {
      localStorage.setItem('citizenComplaints', JSON.stringify([
        { id: 401, poleId: 102, issue: 'Light not working since yesterday', status: 'Pending', submittedBy: 'Anita Sharma', submittedDate: '2024-01-25' }
      ]));
    }

    if (!localStorage.getItem('sensorDevices')) {
      localStorage.setItem('sensorDevices', JSON.stringify([
        { id: 501, poleId: 101, deviceType: 'Voltage Sensor', model: 'VS-2024', installDate: '2024-01-15', status: 'Active' },
        { id: 502, poleId: 102, deviceType: 'Brightness Sensor', model: 'BS-2024', installDate: '2024-01-20', status: 'Inactive' }
      ]));
    }

    if (!localStorage.getItem('maintenanceTeams')) {
      localStorage.setItem('maintenanceTeams', JSON.stringify([
        { id: 601, teamName: 'Team Alpha', members: ['Ravi Kumar', 'John Doe'], specialization: 'Electrical', status: 'Active' },
        { id: 602, teamName: 'Team Beta', members: ['Jane Smith'], specialization: 'Sensor Maintenance', status: 'Active' }
      ]));
    }

    if (!localStorage.getItem('sensorReadings')) {
      localStorage.setItem('sensorReadings', JSON.stringify([
        { id: 701, poleId: 101, voltage: 230, brightness: 80, timestamp: new Date().toISOString() },
        { id: 702, poleId: 102, voltage: 0, brightness: 0, timestamp: new Date().toISOString() },
        { id: 703, poleId: 103, voltage: 228, brightness: 75, timestamp: new Date().toISOString() }
      ]));
    }

    if (!localStorage.getItem('powerConsumption')) {
      localStorage.setItem('powerConsumption', JSON.stringify([
        { id: 801, poleId: 101, date: '2024-01-25', consumption: 2.5, cost: 15.5 },
        { id: 802, poleId: 103, date: '2024-01-25', consumption: 2.3, cost: 14.2 }
      ]));
    }

    if (!localStorage.getItem('notifications')) {
      localStorage.setItem('notifications', JSON.stringify([
        { id: 901, type: 'Alert', message: 'Pole 102 has bulb failure', timestamp: new Date().toISOString(), read: false },
        { id: 902, type: 'Info', message: 'Maintenance scheduled for Pole 104', timestamp: new Date().toISOString(), read: false }
      ]));
    }
  }

  // Generic CRUD operations
  getAll(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  getById(key, id) {
    const items = this.getAll(key);
    return items.find(item => item.id === id);
  }

  create(key, item) {
    const items = this.getAll(key);
    const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
    const newItem = { ...item, id: newId };
    items.push(newItem);
    localStorage.setItem(key, JSON.stringify(items));
    return newItem;
  }

  update(key, id, updates) {
    const items = this.getAll(key);
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates };
      localStorage.setItem(key, JSON.stringify(items));
      return items[index];
    }
    return null;
  }

  delete(key, id) {
    const items = this.getAll(key);
    const filtered = items.filter(item => item.id !== id);
    localStorage.setItem(key, JSON.stringify(filtered));
    return true;
  }

  // Specific entity methods
  // Users
  getUsers() { return this.getAll('users'); }
  createUser(user) { return this.create('users', user); }
  updateUser(id, updates) { return this.update('users', id, updates); }
  deleteUser(id) { return this.delete('users', id); }

  // Light Poles
  getLightPoles() { return this.getAll('lightPoles'); }
  createLightPole(pole) { return this.create('lightPoles', pole); }
  updateLightPole(id, updates) { return this.update('lightPoles', id, updates); }
  deleteLightPole(id) { return this.delete('lightPoles', id); }

  // Incidents
  getIncidents() { return this.getAll('incidents'); }
  createIncident(incident) { return this.create('incidents', incident); }
  updateIncident(id, updates) { return this.update('incidents', id, updates); }
  deleteIncident(id) { return this.delete('incidents', id); }

  // Maintenance Activities
  getMaintenanceActivities() { return this.getAll('maintenanceActivities'); }
  createMaintenanceActivity(activity) { return this.create('maintenanceActivities', activity); }
  updateMaintenanceActivity(id, updates) { return this.update('maintenanceActivities', id, updates); }
  deleteMaintenanceActivity(id) { return this.delete('maintenanceActivities', id); }

  // Citizen Complaints
  getCitizenComplaints() { return this.getAll('citizenComplaints'); }
  createCitizenComplaint(complaint) { return this.create('citizenComplaints', complaint); }
  updateCitizenComplaint(id, updates) { return this.update('citizenComplaints', id, updates); }
  deleteCitizenComplaint(id) { return this.delete('citizenComplaints', id); }

  // Sensor Devices
  getSensorDevices() { return this.getAll('sensorDevices'); }
  createSensorDevice(device) { return this.create('sensorDevices', device); }
  updateSensorDevice(id, updates) { return this.update('sensorDevices', id, updates); }
  deleteSensorDevice(id) { return this.delete('sensorDevices', id); }

  // Maintenance Teams
  getMaintenanceTeams() { return this.getAll('maintenanceTeams'); }
  createMaintenanceTeam(team) { return this.create('maintenanceTeams', team); }
  updateMaintenanceTeam(id, updates) { return this.update('maintenanceTeams', id, updates); }
  deleteMaintenanceTeam(id) { return this.delete('maintenanceTeams', id); }

  // Sensor Readings
  getSensorReadings() { return this.getAll('sensorReadings'); }
  createSensorReading(reading) { return this.create('sensorReadings', reading); }

  // Power Consumption
  getPowerConsumption() { return this.getAll('powerConsumption'); }
  createPowerConsumption(consumption) { return this.create('powerConsumption', consumption); }

  // Notifications
  getNotifications() { return this.getAll('notifications'); }
  createNotification(notification) { return this.create('notifications', notification); }
  markNotificationRead(id) { return this.update('notifications', id, { read: true }); }

  // Authentication
  authenticate(email, password, role) {
    const users = this.getUsers();
    const user = users.find(u => u.email === email && u.password === password && u.role === role);
    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return null;
  }

  register(user) {
    const users = this.getUsers();
    if (users.find(u => u.email === user.email)) {
      return { error: 'User with this email already exists' };
    }
    return this.createUser(user);
  }
}

const dataService = new DataService();
export default dataService;
