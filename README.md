# FRC Dashboard 2026

A modern, high-performance web dashboard for FRC robots using **React**, **TypeScript**, and **NetworkTables 4 (NT4)**.

## 🚀 Quick Stafrt

### 1. Installation
Ensure you have [Node.js](https://nodejs.org/) installed, then run:
```bashgemini

### 3. Running the Dashboard
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🛠 Project Structure & Logic

This project is built using **Vite + React + Tailwind CSS**.

### Dependencies (The "Requirements")
In Node.js projects, dependencies are managed in **`package.json`** (equivalent to `requirements.txt` in Python).
- `ntcore-ts-client`: Handles the NT4 WebSocket connection.
- `tailwindcss`: Utility-first CSS framework for styling.
- `lucide-react`: Icon library (optional).

### Custom Components
All components are designed to be **bidirectional**: they update when the robot sends data, and they send data when you interact with them.

| Component | Path | Description |
| :--- | :--- | :--- |
| **NTButton** | `src/components/NTButton.tsx` | A toggle button (Boolean). |
| **NTMomentary** | `src/components/NTMomentaryButton.tsx` | Active only while pressed (Boolean). |
| **NTNumber** | `src/components/NTNumberReadout.tsx` | Displays numeric values (Voltage, Sensors). |
| **NTSlider** | `src/components/NTSlider.tsx` | Adjustable slider (0.0 to 1.0). |
| **NTClock** | `src/components/NTClock.tsx` | Match timer with mode-based color coding. |

---

## 🤖 Robot Side Integration (Java Example)

To talk to this dashboard, use the standard WPILib NetworkTables API:

```java
// Match Timer
NetworkTableInstance.getDefault()
    .getTable("FMS")
    .getEntry("time")
    .setDouble(135.0);

// Buttons
boolean intake = NetworkTableInstance.getDefault()
    .getTable("dashboard")
    .getEntry("intake")
    .getBoolean(false);
```

## 🏗 Building for Competition
To create a fast, production-ready version of the dashboard for use at events:
```bash
npm run build
```
The optimized files will be in the `/dist` folder.
