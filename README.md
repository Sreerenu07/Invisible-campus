# INVISIBLE CAMPUS — Jaya Engineering College

**Invisible Campus** is a smart campus infrastructure issue reporting and recurring hotspot detection platform designed for **Jaya Engineering College**. It transforms scattered student infrastructure complaints into actionable campus infrastructure intelligence.

---

## 🌟 Key Features

1. **Recurring Hotspot Detection (Main USP)**:
   - Grouping issues by building location.
   - Automatically flagging any building with **2 or more reports** as an *Emerging Hotspot*.
   - Spatial visual indicators on the interactive campus map.

2. **Interactive Campus Map**:
   - Custom layout reflecting the exact relative placement of key Jaya Engineering College buildings (Auditorium, Canteen, Main Block, Mech, Civil, ECE, Aero, CSE, Library Block).
   - Real-time animated pulsing markers for emerging hotspots.
   - Clickable building nodes showing detailed report statistics and recent issues.

3. **Computer Vision Assisted Categorization (OpenCV)**:
   - Optional assistive image analysis powered by OpenCV.
   - Analyzes uploaded photo features (color spectrum, edge density, brightness variance) to suggest issue categories (e.g., Plumbing, Furniture, Civil/Structural, Electrical).
   - Keeps manual category selection available at all times.

4. **Full Maintenance Workflow**:
   - Ticket assignment to specialized maintenance teams (Electrical, Plumbing, Civil, General Maintenance).
   - Real-time state transitions: `Pending` → `In Progress` → `Resolved`.
   - Real-time synchronization across Dashboard, My Reports, Hotspots, Campus Map, and Maintenance views.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (Single Page Application architecture, no external JS frameworks).
- **Backend**: Python 3, Flask, Flask REST API.
- **Database**: SQLite, Flask-SQLAlchemy ORM.
- **Computer Vision**: OpenCV (`opencv-python-headless`), Pillow.

---

## 📁 Project Structure

```
invisible-campus/
│
├── app.py                 # Flask server, REST API endpoints, database models & OpenCV logic
├── requirements.txt       # Python dependency definitions
├── database.db            # SQLite database (auto-generated)
├── README.md              # Documentation
│
├── templates/
│   └── index.html         # Main single-page application HTML document
│
├── static/
│   ├── style.css          # Pastel design system stylesheet
│   └── script.js          # SPA interactive state controller & map renderer
│
└── uploads/               # Directory for uploaded issue images
```

---

## 🚀 Installation & How to Run

### Step 1: Set up Virtual Environment (Optional but recommended)
```bash
python -m venv venv
```

On Windows:
```cmd
venv\Scripts\activate
```

On macOS / Linux:
```bash
source venv/bin/activate
```

### Step 2: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 3: Run Application
```bash
python app.py
```

### Step 4: Open in Browser
Navigate to:
```
http://127.0.0.1:5000
```

---

## 📡 REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Serves the SPA frontend (`index.html`) |
| `GET` | `/api/stats` | Returns aggregated count: `{ total, pending, in_progress, resolved }` |
| `GET` | `/api/reports` | Returns list of all infrastructure reports (supports building & status filtering) |
| `GET` | `/api/reports/<id>` | Returns details for a single report |
| `POST` | `/api/reports` | Accepts `multipart/form-data` to submit a new issue report with optional image upload |
| `PUT` | `/api/reports/<id>` | Updates `status` (`Pending`, `In Progress`, `Resolved`) and/or `assigned_team` |
| `GET` | `/api/hotspots` | Groups reports by building and returns locations with `report_count >= 2` |
| `GET` | `/api/buildings/<building>` | Returns spatial statistics and recent reports for a specific campus building |
| `POST` | `/api/analyze-image` | Accepts an uploaded image file and returns an OpenCV suggested issue category |

---

## 🔥 Hotspot Detection Logic

Hotspot detection is completely backend-driven:
1. All report records are fetched and grouped by building (`Report.building`).
2. If `report_count >= 2`, the building is classified as an `Emerging Hotspot`.
3. The frontend retrieves hotspot status via `GET /api/hotspots` and dynamically highlights affected buildings on the interactive campus map with pulsing pastel radar indicators.

---

## 🏆 Demo Workflow

1. Open Dashboard (`http://127.0.0.1:5000`).
2. Click **Report Issue**. Submit a report for **CSE Block** (Category: Electrical, Description: Fan not working).
3. Submit a second report for **CSE Block** (Category: Furniture, Description: Broken desk in Room 204).
4. View the **Dashboard** or **Campus Map**: **CSE Block** is automatically highlighted as an **Emerging Hotspot** with 2 reports!
5. Navigate to **Maintenance**. Select **Electrical Team** and click **Assign Task** on the CSE Block issue (Status changes to `In Progress`).
6. Click **Mark Resolved** (Status changes to `Resolved`).
7. Dashboard and My Reports automatically synchronize in real time.
