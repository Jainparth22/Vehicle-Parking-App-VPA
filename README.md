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
