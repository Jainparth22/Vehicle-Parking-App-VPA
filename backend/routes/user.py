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
    lots = ParkingLot.query.filter(
        db.or_(
            ParkingLot.prime_location_name.ilike(f'%{q}%'),
            ParkingLot.address.ilike(f'%{q}%'),
            ParkingLot.pin_code.ilike(f'%{q}%'),
        )
    ).all()

    # Attach availability
    results = []
    for lot in lots:
        d = lot.to_dict()
        d['available_spots'] = lot.spots.filter_by(status='A').count()
        results.append(d)

    return jsonify(results), 200


@user_bp.route('/lots/<int:lot_id>', methods=['GET'])
@role_required('user')
def get_lot_details(user, lot_id):
    lot = ParkingLot.query.get_or_404(lot_id)
    return jsonify(lot.to_dict()), 200


# ── Reserve Spot ──────────────────────────────────────────────────────────────

@user_bp.route('/reserve/<int:lot_id>', methods=['POST'])
@role_required('user')
def reserve_spot(user, lot_id):
    lot = ParkingLot.query.get_or_404(lot_id)
    data = request.json or {}
    vehicle_number = data.get('vehicle_number', '').strip().upper()

    ok, err = validate_vehicle_number(vehicle_number)
    if not ok:
        return jsonify({'error': err}), 400

    # Find first available spot
    spot = ParkingSpot.query.filter_by(lot_id=lot_id, status='A').order_by(
        ParkingSpot.spot_number.asc()
    ).first()

    if not spot:
        return jsonify({'error': 'No available spots in this parking lot'}), 400

    # Create reservation
    reservation = Reservation(
        spot_id=spot.id,
        user_id=user.id,
        vehicle_number=vehicle_number or None,
        parking_timestamp=datetime.utcnow(),
        # Snapshot lot data at booking time
        lot_id_at_booking=lot.id,
        lot_name_at_booking=lot.prime_location_name,
        lot_address_at_booking=lot.address,
        price_per_hour_at_booking=lot.price_per_hour,
        spot_number_at_booking=spot.spot_number,
    )

    spot.status = 'O'
    db.session.add(reservation)
    db.session.commit()

    # In-app notification
    notif = Notification(
        user_id=user.id,
        message=f'Spot #{spot.spot_number} reserved at {lot.prime_location_name}. Happy parking!',
        channel='in-app',
        is_sent=True,
    )
    db.session.add(notif)
    db.session.commit()

    cache_delete('admin:dashboard')
    cache_delete_pattern('user:lots*')
    return jsonify({
        'message': f'Spot #{spot.spot_number} reserved successfully at {lot.prime_location_name}!',
        'reservation': reservation.to_dict(),
    }), 201


# ── Release Spot ──────────────────────────────────────────────────────────────

@user_bp.route('/reservations/<int:reservation_id>/release', methods=['PUT'])
@role_required('user')
def release_spot(user, reservation_id):
    reservation = Reservation.query.get_or_404(reservation_id)

    if reservation.user_id != user.id:
        return jsonify({'error': 'Unauthorized — this is not your reservation'}), 403

    if reservation.leaving_timestamp:
        return jsonify({'error': 'This reservation has already been completed'}), 400

    reservation.leaving_timestamp = datetime.utcnow()
    reservation.calculate_cost()

    spot = ParkingSpot.query.get(reservation.spot_id)
    if spot:
        spot.status = 'A'

    db.session.commit()

    notif = Notification(
        user_id=user.id,
        message=f'Spot #{reservation.get_spot_number()} released. Total cost: ₹{reservation.parking_cost:.2f}',
        channel='in-app',
        is_sent=True,
    )
    db.session.add(notif)
    db.session.commit()

    cache_delete('admin:dashboard')
    cache_delete_pattern('user:lots*')
    return jsonify({
        'message': 'Parking spot released successfully',
        'reservation': reservation.to_dict(),
    }), 200


# ── Reservations History ──────────────────────────────────────────────────────

@user_bp.route('/reservations', methods=['GET'])
@role_required('user')
def my_reservations(user):
    status = request.args.get('status', 'all')
    query = Reservation.query.filter_by(user_id=user.id)

    if status == 'active':
        query = query.filter(Reservation.leaving_timestamp.is_(None))
    elif status == 'completed':
        query = query.filter(Reservation.leaving_timestamp.isnot(None))

    reservations = query.order_by(Reservation.parking_timestamp.desc()).all()
    return jsonify([r.to_dict() for r in reservations]), 200


@user_bp.route('/reservations/<int:reservation_id>', methods=['GET'])
@role_required('user')
def get_reservation(user, reservation_id):
    reservation = Reservation.query.get_or_404(reservation_id)
    if reservation.user_id != user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    return jsonify(reservation.to_dict()), 200


# ── Summary / Analytics for User ─────────────────────────────────────────────

@user_bp.route('/analytics', methods=['GET'])
@role_required('user')
def user_analytics(user):
    reservations = Reservation.query.filter_by(user_id=user.id).all()
    completed = [r for r in reservations if r.leaving_timestamp]

    total_spent = sum(r.parking_cost for r in completed)
    total_hours = sum(
        (r.leaving_timestamp - r.parking_timestamp).total_seconds() / 3600
        for r in completed
        if r.parking_timestamp and r.leaving_timestamp
    )

    # Most used lot
    lot_counts = {}
    for res in completed:
        lot_name = res.get_lot_name()
        lot_counts[lot_name] = lot_counts.get(lot_name, 0) + 1
    most_used = max(lot_counts, key=lot_counts.get) if lot_counts else None

    # Monthly spending
    monthly = {}
    for res in completed:
        if res.parking_timestamp:
            month = res.parking_timestamp.strftime('%Y-%m')
            monthly[month] = monthly.get(month, 0) + res.parking_cost
    monthly_data = [
        {'month': k, 'amount': round(v, 2)}
        for k, v in sorted(monthly.items())[-6:]
    ]

    # Lot breakdown for pie chart
    lot_breakdown = [
        {'lot': k, 'count': v, 'percentage': round(v / len(completed) * 100, 1) if completed else 0}
        for k, v in lot_counts.items()
    ]

    return jsonify({
        'total_reservations': len(reservations),
        'completed_reservations': len(completed),
        'active_reservations': len(reservations) - len(completed),
        'total_spent': round(total_spent, 2),
        'total_hours': round(total_hours, 2),
        'most_used_lot': most_used,
        'monthly_spending': monthly_data,
        'lot_breakdown': lot_breakdown,
    }), 200


# ── Export CSV (Async) ────────────────────────────────────────────────────────

@user_bp.route('/export-csv', methods=['POST'])
@role_required('user')
def trigger_csv_export(user):
    from tasks import export_parking_csv

    job = AsyncJob(user_id=user.id, job_type='csv_export', status='pending')
    db.session.add(job)
    db.session.commit()

    export_parking_csv.delay(user_id=user.id, job_id=job.id)
    return jsonify({
        'message': 'CSV export started. You\'ll be notified when it\'s ready.',
        'job_id': job.id,
    }), 202


@user_bp.route('/download-csv/<int:job_id>', methods=['GET'])
@role_required('user')
def download_csv(user, job_id):
    job = AsyncJob.query.get_or_404(job_id)

    if job.user_id != user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    if job.status != 'completed':
        return jsonify({'status': job.status, 'message': 'Export not ready yet'}), 202
    if not job.file_path or not os.path.exists(job.file_path):
        return jsonify({'error': 'File not found'}), 404

    return send_file(job.file_path, as_attachment=True, download_name='parking_history.csv')
