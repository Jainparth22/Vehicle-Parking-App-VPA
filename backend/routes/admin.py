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

    all_lots = ParkingLot.query.all()
    all_reservations = Reservation.query.all()
    all_users = User.query.filter_by(role='user').all()

    total_spots = sum(lot.number_of_spots for lot in all_lots)
    occupied_spots = sum(lot.spots.filter_by(status='O').count() for lot in all_lots)
    available_spots = total_spots - occupied_spots

    completed_res = [r for r in all_reservations if r.leaving_timestamp]
    total_revenue = sum(r.parking_cost for r in completed_res)
    active_res = [r for r in all_reservations if not r.leaving_timestamp]

    # Revenue per lot
    lot_revenue = {}
    for res in completed_res:
        lot_name = res.get_lot_name()
        lot_revenue[lot_name] = lot_revenue.get(lot_name, 0) + res.parking_cost
    top_lots = sorted(lot_revenue.items(), key=lambda x: x[1], reverse=True)[:5]

    # Recent activity (last 10)
    recent = sorted(
        [r for r in all_reservations if r.spot and r.spot.lot],
        key=lambda x: x.parking_timestamp or datetime.min, reverse=True
    )[:10]

    data = {
        'total_lots': len(all_lots),
        'total_spots': total_spots,
        'occupied_spots': occupied_spots,
        'available_spots': available_spots,
        'occupancy_rate': round(occupied_spots / total_spots * 100, 1) if total_spots else 0,
        'total_revenue': round(total_revenue, 2),
        'active_reservations': len(active_res),
        'completed_reservations': len(completed_res),
        'total_users': len(all_users),
        'top_lots': [{'name': n, 'revenue': round(r, 2)} for n, r in top_lots],
        'recent_reservations': [r.to_dict() for r in recent],
        'lots': [_lot_summary(l) for l in all_lots],
    }
    cache_set('admin:dashboard', data, ttl=120)
    return jsonify(data), 200


# ── Users ─────────────────────────────────────────────────────────────────────

@admin_bp.route('/users', methods=['GET'])
