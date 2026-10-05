# Smart Street Light Management System

A comprehensive web application for managing smart street light infrastructure with role-based access control.

## Features

### Role-Based Dashboard
- **Authority**: Full system access including users, poles, sensors, power consumption, incidents, maintenance, and notifications
- **Maintenance Staff**: Access to incidents and maintenance activities
- **Citizen**: Access to incidents and complaint submission

### Core Functionality
- **User Management**: System user administration
- **Light Pole Management**: Track pole locations and status
- **Real-time Sensor Data**: Monitor voltage and brightness readings
- **Power Consumption Tracking**: Energy usage monitoring
- **Incident Management**: Report and track issues
- **Maintenance Activities**: Schedule and track maintenance
- **Citizen Complaints**: Public issue reporting
- **Sensor Device Management**: Admin sensor configuration
- **Maintenance Teams**: Team management and assignment
- **Notification System**: Real-time alerts and logs

## Technology Stack

- **Frontend**: React 18 with React Router
- **Styling**: Custom CSS with CSS variables
- **Icons**: React Icons
- **Build Tool**: Create React App

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Navigate to the frontend directory
3. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

### Building for Production

Create a production build:
```bash
npm run build
```

## Usage

### Authentication
- Use the Login page to access the system
- Select your role (Authority, Maintenance Staff, or Citizen)
- New users can sign up using the Signup page

### Dashboard Navigation
- Each role has a customized dashboard with relevant features
- Navigate between sections using the intuitive interface
- Real-time updates for sensor data and incidents

### Key Features
- **Real-time Monitoring**: Sensor readings update automatically every 3 seconds
- **Responsive Design**: Works on desktop and mobile devices
- **Interactive Forms**: Properly styled forms with validation
- **Data Tables**: Organized display of system data
- **Status Tracking**: Visual indicators for system status

## File Structure

```
src/
├── components/
│   ├── Login.js          # Authentication component
│   ├── Signup.js         # User registration
│   ├── SystemUser.js     # User management
│   ├── LightPole.js      # Pole management
│   ├── SensorReading.js  # Real-time sensor data
│   ├── PowerConsumption.js # Energy monitoring
│   ├── Incident.js       # Incident tracking
│   ├── MaintenanceActivity.js # Maintenance tracking
│   ├── CitizenComplaint.js # Public complaints
│   ├── SensorDevice.js   # Sensor management
│   ├── MaintenanceTeam.js # Team management
│   └── NotificationLog.js # Notification system
├── App.js                # Main application component
├── styles.css            # Comprehensive styling
├── App.css               # Additional app styles
└── index.js              # Application entry point
```

## Customization

### Styling
- CSS variables are used for easy theme customization
- Primary color scheme can be modified in `styles.css`
- Responsive breakpoints are defined for mobile compatibility

### Adding New Features
- Follow the existing component structure
- Use consistent styling classes
- Implement proper table structure with thead/tbody
- Add form validation for user inputs

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
