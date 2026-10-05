# Smart Street Light Fault Detection System – DBMS UI

This is a **React.js** front-end for a college DBMS project titled **“Smart Street Light Fault Detection System”**.  
It is intentionally simple and academic, focusing on **clear mapping to database tables** and **role-based dashboards**.

## How to run

### Backend (required for login/register and API)

1. Install MySQL and create a database, e.g. `streetlight_db`.
2. Set env vars if needed: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
3. In a terminal:

   ```bash
   cd "d:\DBMS Project\street-light-project\backend"
   npm install
   npm start
   ```

   The API runs at **http://localhost:4002**. Endpoints include:
   - `POST /api/auth/register` – register (name, email, password, role)
   - `POST /api/auth/login` – login (email, password)
   - `POST /api/auth/signup` – signup (fullName, email, password, confirmPassword, role)

### Frontend

1. Make sure Node.js (LTS) is installed.
2. In the project root:

   ```bash
   npm install
   npm run dev
   ```

3. Open the printed URL (usually `http://localhost:5173`). The app calls the backend at **http://localhost:4002** for auth and data.

## Main structure

- `src/App.jsx` – Root component, handles simple role-based navigation.
- `src/pages/LoginPage.jsx` – Login screen with email, password (demo only), and role selector.
- `src/pages/AuthorityDashboard.jsx` – Shows:
  - System Users
  - Light Poles
  - Sensor Readings
  - Power Consumption
  - Incidents
  - Maintenance Activity
  - Sensor Devices
  - Maintenance Teams
  - Notification Log
- `src/pages/MaintenanceDashboard.jsx` – Shows:
  - Assigned Incidents
  - Maintenance Activity status updates (UI-only, in-memory state)
- `src/pages/CitizenDashboard.jsx` – Shows:
  - Nearby incidents
  - Register Complaint form
  - Complaint submission confirmation

All data is **mocked on the frontend** using simple JavaScript arrays and React state.  
This makes it easy to explain how each UI section corresponds to a **database table** in your DBMS design.

