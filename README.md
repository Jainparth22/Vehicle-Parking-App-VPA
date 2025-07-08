---
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
