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
@role_required('admin')
def list_users(user):
    users = User.query.filter_by(role='user').order_by(User.created_at.desc()).all()
    return jsonify([u.to_dict() for u in users]), 200


# ── Parking Lots ──────────────────────────────────────────────────────────────

@admin_bp.route('/lots', methods=['GET'])
@role_required('admin')
def list_lots(user):
    lots = ParkingLot.query.order_by(ParkingLot.created_at.desc()).all()
    return jsonify([_lot_summary(l) for l in lots]), 200


@admin_bp.route('/lots', methods=['POST'])
@role_required('admin')
def create_lot(user):
    data = request.json or {}
    name = data.get('prime_location_name', '').strip()
    address = data.get('address', '').strip()
    pin_code = data.get('pin_code', '').strip()
    price = data.get('price_per_hour', 0)
    spots = data.get('number_of_spots', 0)

    # Validate
    ok, err = validate_name(name, 'Location name')
    if not ok:
        return jsonify({'error': err}), 400
    ok, err = validate_name(address, 'Address')
    if not ok:
        return jsonify({'error': err}), 400
    ok, err = validate_pin_code(pin_code)
    if not ok:
        return jsonify({'error': err}), 400
    ok, err = validate_price(price)
    if not ok:
        return jsonify({'error': err}), 400
    ok, err = validate_spots(spots)
    if not ok:
        return jsonify({'error': err}), 400

    lot = ParkingLot(
        prime_location_name=name,
        address=address,
        pin_code=pin_code,
        price_per_hour=float(price),
        number_of_spots=int(spots),
    )
    db.session.add(lot)
    db.session.flush()  # Get lot.id

    # Create spots
    for i in range(1, int(spots) + 1):
        db.session.add(ParkingSpot(lot_id=lot.id, spot_number=i, status='A'))

    db.session.commit()
    cache_delete('admin:dashboard')
    cache_delete_pattern('user:lots*')
    return jsonify({'message': 'Parking lot created successfully', 'lot': lot.to_dict(include_spots=True)}), 201


@admin_bp.route('/lots/<int:lot_id>', methods=['GET'])
@role_required('admin')
def get_lot(user, lot_id):
    lot = ParkingLot.query.get_or_404(lot_id)
    return jsonify(lot.to_dict(include_spots=True)), 200


@admin_bp.route('/lots/<int:lot_id>', methods=['PUT'])
@role_required('admin')
def edit_lot(user, lot_id):
    lot = ParkingLot.query.get_or_404(lot_id)
    data = request.json or {}

    name = data.get('prime_location_name', lot.prime_location_name).strip()
    address = data.get('address', lot.address).strip()
    pin_code = data.get('pin_code', lot.pin_code).strip()
    price = data.get('price_per_hour', lot.price_per_hour)
    new_spots = int(data.get('number_of_spots', lot.number_of_spots))

    ok, err = validate_name(name, 'Location name')
    if not ok:
        return jsonify({'error': err}), 400
    ok, err = validate_pin_code(pin_code)
    if not ok:
        return jsonify({'error': err}), 400
    ok, err = validate_price(price)
    if not ok:
        return jsonify({'error': err}), 400
    ok, err = validate_spots(new_spots)
    if not ok:
        return jsonify({'error': err}), 400

    occupied_count = lot.spots.filter_by(status='O').count()
    if new_spots < occupied_count:
        return jsonify({
            'error': f'Cannot reduce to {new_spots} spots — {occupied_count} spots are currently occupied'
        }), 400

    current_count = lot.spots.count()
    if new_spots > current_count:
        max_num = db.session.query(db.func.max(ParkingSpot.spot_number)).filter_by(lot_id=lot.id).scalar() or 0
        for i in range(max_num + 1, max_num + (new_spots - current_count) + 1):
            db.session.add(ParkingSpot(lot_id=lot.id, spot_number=i, status='A'))
    elif new_spots < current_count:
        to_remove = ParkingSpot.query.filter_by(lot_id=lot.id, status='A').order_by(
            ParkingSpot.spot_number.desc()
        ).limit(current_count - new_spots).all()
        for spot in to_remove:
            db.session.delete(spot)

    lot.prime_location_name = name
    lot.address = address
    lot.pin_code = pin_code
    lot.price_per_hour = float(price)
    lot.number_of_spots = new_spots
    db.session.commit()

    cache_delete('admin:dashboard')
    cache_delete_pattern('user:lots*')
    return jsonify({'message': 'Parking lot updated', 'lot': lot.to_dict(include_spots=True)}), 200


@admin_bp.route('/lots/<int:lot_id>', methods=['DELETE'])
@role_required('admin')
def delete_lot(user, lot_id):
    lot = ParkingLot.query.get_or_404(lot_id)
    lot_name = lot.prime_location_name

    occupied = lot.spots.filter_by(status='O').count()
    if occupied > 0:
        return jsonify({'error': f'Cannot delete lot — {occupied} spots are currently occupied'}), 400

    # Nullify spot_id on historical reservations so FK constraint is satisfied
    # (historical data preserved via lot_name_at_booking, spot_number_at_booking etc.)
    spot_ids = [s.id for s in lot.spots.all()]
    if spot_ids:
        Reservation.query.filter(Reservation.spot_id.in_(spot_ids)).update(
            {Reservation.spot_id: None}, synchronize_session='fetch'
        )

    db.session.delete(lot)
    db.session.commit()
    cache_delete('admin:dashboard')
    cache_delete_pattern('user:lots*')
    return jsonify({'message': f'Parking lot "{lot_name}" deleted successfully'}), 200


@admin_bp.route('/lots/<int:lot_id>/spots', methods=['GET'])
@role_required('admin')
def get_lot_spots(user, lot_id):
    lot = ParkingLot.query.get_or_404(lot_id)
    spots = lot.spots.order_by(ParkingSpot.spot_number).all()
    return jsonify([s.to_dict() for s in spots]), 200


# ── Reservations (admin view) ─────────────────────────────────────────────────

@admin_bp.route('/reservations', methods=['GET'])
@role_required('admin')
def list_reservations(user):
    status = request.args.get('status', 'all')
    lot_id = request.args.get('lot_id')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 50))

    query = Reservation.query
    if status == 'active':
        query = query.filter(Reservation.leaving_timestamp.is_(None))
    elif status == 'completed':
        query = query.filter(Reservation.leaving_timestamp.isnot(None))
    if lot_id:
        query = query.filter_by(lot_id_at_booking=int(lot_id))

    reservations = query.order_by(Reservation.parking_timestamp.desc()).all()
    return jsonify([r.to_dict() for r in reservations]), 200


# ── Search ────────────────────────────────────────────────────────────────────

@admin_bp.route('/search', methods=['GET'])
@role_required('admin')
