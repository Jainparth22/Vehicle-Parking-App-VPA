<hr>

**Student:** Parth Jain &nbsp;|&nbsp; **IITM ID:** 23f2003877 &nbsp;|&nbsp; **VIT ID:** 23bce10156  
**Programme:** IIT Madras BS in Data Science & Applications  
**Course:** Application Development II (MAD-II)

---

# 🅿️ Vehicle Parking App (VPA)

A multi-user Vehicle Parking Management System built with **Flask** (REST API), **Vue 3** (CDN frontend), **SQLite**, **Redis**, and **Celery** background jobs.

---

## 🚀 Features

### Admin
- Auto-created superuser (no registration)
- **Parking Lot Management** — Create / Edit / Delete lots (only if all spots are empty)
- **Spot Grid View** — Visual map of all spots; click occupied to see customer details
- **All Reservations** — View all bookings across all lots
- **Search** — Search by lot name, PIN code, user email
- **Analytics & Charts** — Revenue per lot, daily bookings, occupancy (Chart.js)
- **Monthly Reports** — Auto-generated HTML + PDF reports, emailed to admin
- **User Management** — View all registered users

### User
- **Register / Login** — Email-based JWT authentication
- **Browse & Search** — Find parking lots by location or PIN code
- **Book a Spot** — System auto-assigns first available spot; enter vehicle number
- **Release a Spot** — Calculates final cost (duration × price per hour)
- **History** — View all past and active reservations
- **Summary Charts** — Monthly spending, lot breakdown (Chart.js)
- **Export CSV** — Trigger async export of full parking history

### Background Jobs (Celery + Redis)
| Job | Schedule | Description |
|---|---|---|
| `send_daily_reminders` | Every 24 hours | Email + Google Chat reminder to inactive users |
| `generate_monthly_report` | Every 30 days | HTML/PDF report emailed to admin |
| `export_parking_csv` | User-triggered | Async CSV export, notifies when ready |

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Flask 3.0, Flask-SQLAlchemy, Flask-CORS, Flask-Mail |
| Database | SQLite (via SQLAlchemy) |
| Auth | Custom JWT (PyJWT) — token-based, role-based access control |
| Frontend | Vue 3 (CDN), Axios, Bootstrap 5, Chart.js, Bootstrap Icons |
| Caching | Redis |
| Background Jobs | Celery + Redis |
| Email | Flask-Mail (SMTP/Gmail) |
| Alerts | Google Chat Webhooks |

> **Note on Flask-Security:** Custom JWT was chosen over Flask-Security for full control over token payload, role-based decorators, and the ability to run without session state. This provides a clean REST API that works seamlessly with the Vue 3 SPA.

---

## 📁 Folder Structure

```
P2 vehicle-parking-app/
├── run.py                          ← Entry point
├── requirements.txt                ← Python dependencies (clean, 12 packages)
├── .env.example                    ← Environment variables template
├── .gitignore
├── README.md
│
├── backend/
│   ├── app.py                      ← Flask app factory + auth routes
│   ├── auth.py                     ← JWT helpers and decorators
│   ├── cache.py                    ← Redis cache singleton
│   ├── celery_worker.py            ← Celery app + beat schedule
│   ├── config.py                   ← Configuration (loads from .env)
│   ├── models.py                   ← SQLAlchemy models
│   ├── tasks.py                    ← Celery background tasks (3 tasks)
│   ├── validators.py               ← Input validation helpers
│   └── routes/
│       ├── __init__.py
│       ├── admin.py                ← Admin REST API routes
│       └── user.py                 ← User REST API routes
│
└── frontend/
    ├── static/
    │   ├── css/style.css           ← Custom dark glassmorphism theme
    │   └── js/
    │       ├── app.js              ← Vue 3 root app (navigation, toasts, auth)
    │       └── pages.js            ← Vue page components (all pages)
    └── templates/
        └── index.html              ← SPA entry point (CDN imports)
```

---

## 🗄️ Database Schema (ER Summary)

| Table | Key Fields |
|---|---|
| `users` | id, email, password_hash, role (admin/user), full_name, address, pin_code |
| `parking_lots` | id, prime_location_name, address, pin_code, price_per_hour, number_of_spots |
| `parking_spots` | id, lot_id (FK), spot_number, status (A/O) |
| `reservations` | id, spot_id (FK), user_id (FK), vehicle_number, parking_timestamp, leaving_timestamp, parking_cost |
| `monthly_reports` | id, month, total_reservations, total_revenue, report_path |
| `notifications` | id, user_id (FK), message, channel, is_read |
| `async_jobs` | id, user_id (FK), job_type, status, file_path |

---

## 🛠️ Installation & Setup

### 1. Clone / Navigate to project
```bash
cd "P2 vehicle-parking-app"
```

### 2. Create virtual environment
```bash
python -m venv venv
venv\Scripts\activate    # Windows
source venv/bin/activate # Mac/Linux
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure environment
```bash
copy .env.example .env    # Windows
cp .env.example .env      # Mac/Linux
# Edit .env with your settings
```

### 5. Run the app
```bash
python run.py
# Open http://localhost:5002
```

### 6. (Optional) Start Celery workers
```bash
cd backend
celery -A celery_worker.celery worker --loglevel=info
celery -A celery_worker.celery beat   --loglevel=info
```

---

## 🔌 API Endpoints

### Auth (`/api/auth/`)
| Method | URL | Description |
|---|---|---|
| POST | `/api/auth/login` | Login → JWT token |
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current user info |
| PUT | `/api/auth/me` | Update profile |

### Admin (`/api/admin/`) — `role: admin` required
| Method | URL | Description |
|---|---|---|
| GET | `/api/admin/dashboard` | Stats: lots, spots, revenue, occupancy |
| GET | `/api/admin/users` | List all registered users |
| GET | `/api/admin/lots` | List all parking lots |
| POST | `/api/admin/lots` | Create new parking lot |
| GET | `/api/admin/lots/<id>` | Lot details with all spots |
| PUT | `/api/admin/lots/<id>` | Edit lot |
| DELETE | `/api/admin/lots/<id>` | Delete lot (only if all spots empty) |
| GET | `/api/admin/lots/<id>/spots` | List all spots in a lot |
| GET | `/api/admin/reservations` | All reservations (filter: status, lot_id) |
| GET | `/api/admin/search?q=&type=` | Search lots/spots/users |
| GET | `/api/admin/analytics` | Chart data: revenue, daily, occupancy |
| GET | `/api/admin/reports` | List generated monthly reports |
| POST | `/api/admin/reports/generate` | Trigger async monthly report |
| GET | `/api/admin/reports/download/<id>` | Download report file |

### User (`/api/user/`) — `role: user` required
| Method | URL | Description |
|---|---|---|
| GET | `/api/user/dashboard` | User stats, active reservations, available lots |
| GET | `/api/user/lots` | Browse all parking lots |
| GET | `/api/user/lots/search?q=` | Search lots by name/address/PIN |
| GET | `/api/user/lots/<id>` | Lot details |
| POST | `/api/user/reserve/<lot_id>` | Book spot (vehicle_number optional) |
| PUT | `/api/user/reservations/<id>/release` | Release spot + calculate cost |
| GET | `/api/user/reservations` | My reservation history |
| GET | `/api/user/reservations/<id>` | Single reservation details |
| GET | `/api/user/analytics` | Personal stats + chart data |
| POST | `/api/user/export-csv` | Trigger async CSV export |
| GET | `/api/user/download-csv/<job_id>` | Download CSV when ready |

### Notifications
| Method | URL | Description |
|---|---|---|
| GET | `/api/notifications` | My notifications |
| PUT | `/api/notifications/<id>/read` | Mark one as read |
| PUT | `/api/notifications/read-all` | Mark all as read |
| GET | `/api/jobs/<job_id>` | Poll async job status |

---

## 🔐 Default Credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@parkingapp.com` | `admin123` |
| User | Register via the app | — |

> Change these in your `.env` file before deploying.

---

## 📊 Business Logic

- **Spot assignment**: Always auto-assigns the **first available spot** (lowest spot number). Users cannot select a specific spot.
- **Cost calculation**: `duration_hours × price_per_hour_at_booking`. Historical price is preserved even if the lot's price changes later.
- **Delete restriction**: A parking lot can only be deleted if **all spots are unoccupied**.
- **Historical preservation**: Reservations store lot name, address, and price at booking time — data remains intact even if the lot is later deleted.

---

## 📝 Notes

- The database is created programmatically via `db.create_all()` — no manual DB creation required.
- Admin is auto-seeded on first run using credentials from `.env`.
- Redis is optional for development — the app runs without it (caching silently disabled, Celery tasks won't execute).
