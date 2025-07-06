import os
import csv
from flask import Blueprint, jsonify, request, send_file
from datetime import datetime

from models import db, User, ParkingLot, ParkingSpot, Reservation, Notification, AsyncJob
from auth import role_required, login_required
from cache import cache_get, cache_set, cache_delete, cache_delete_pattern
from validators import validate_vehicle_number

user_bp = Blueprint('user', __name__, url_prefix='/api/user')


# ── Dashboard ─────────────────────────────────────────────────────────────────

@user_bp.route('/dashboard', methods=['GET'])
@role_required('user')
def dashboard(user):
    reservations = Reservation.query.filter_by(user_id=user.id).order_by(
        Reservation.parking_timestamp.desc()
    ).all()

    active_res = [r for r in reservations if not r.leaving_timestamp]
    completed_res = [r for r in reservations if r.leaving_timestamp]
    total_spent = sum(r.parking_cost for r in completed_res)

    # Current live cost for active reservations
    now = datetime.utcnow()
    active_data = []
    for r in active_res:
        d = r.to_dict()
        active_data.append(d)

    # Available lots
    all_lots = ParkingLot.query.all()
    available_lots = [
        l.to_dict() for l in all_lots if l.spots.filter_by(status='A').count() > 0
    ]

    unread_notifications = Notification.query.filter_by(
        user_id=user.id, is_read=False
    ).count()

    return jsonify({
        'user': user.to_dict(),
        'active_reservations': [r.to_dict() for r in active_res],
        'recent_completed': [r.to_dict() for r in completed_res[:10]],
        'total_reservations': len(reservations),
        'total_active': len(active_res),
        'total_spent': round(total_spent, 2),
        'available_lots': available_lots,
        'unread_notifications': unread_notifications,
    }), 200


# ── Browse Lots ───────────────────────────────────────────────────────────────

@user_bp.route('/lots', methods=['GET'])
@role_required('user')
def browse_lots(user):
    cache_key = 'user:lots:all'
    cached = cache_get(cache_key)
    if cached:
        return jsonify(cached), 200

    lots = ParkingLot.query.all()
    data = [l.to_dict() for l in lots]
    cache_set(cache_key, data, ttl=60)
    return jsonify(data), 200


@user_bp.route('/lots/search', methods=['GET'])
@role_required('user')
def search_lots(user):
    q = request.args.get('q', '').strip()
    if not q:
        return jsonify({'error': 'Search query is required'}), 400

    # Search by location name or pincode
