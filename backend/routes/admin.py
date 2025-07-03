from flask import Blueprint, jsonify, request, send_file
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta

from models import db, User, ParkingLot, ParkingSpot, Reservation, MonthlyReport, Notification
from auth import role_required
from cache import cache_get, cache_set, cache_delete, cache_delete_pattern
from validators import validate_email, validate_name, validate_pin_code, validate_price, validate_spots

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


def _lot_summary(lot):
    available = lot.spots.filter_by(status='A').count()
    occupied = lot.spots.filter_by(status='O').count()
    revenue = db.session.query(db.func.sum(Reservation.parking_cost)).filter(
        Reservation.lot_id_at_booking == lot.id,
        Reservation.leaving_timestamp.isnot(None)
    ).scalar() or 0.0
    return {**lot.to_dict(), 'revenue': round(revenue, 2)}


# ── Dashboard ─────────────────────────────────────────────────────────────────

@admin_bp.route('/dashboard', methods=['GET'])
@role_required('admin')
def dashboard(user):
    cached = cache_get('admin:dashboard')
    if cached:
        return jsonify(cached), 200

