from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='user')  # admin | user
    full_name = db.Column(db.String(100))
    address = db.Column(db.String(200))
    pin_code = db.Column(db.String(10))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)

    reservations = db.relationship('Reservation', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    notifications = db.relationship('Notification', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    async_jobs = db.relationship('AsyncJob', backref='user', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'role': self.role,
            'full_name': self.full_name,
            'address': self.address,
            'pin_code': self.pin_code,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
        }


class ParkingLot(db.Model):
    __tablename__ = 'parking_lots'
    id = db.Column(db.Integer, primary_key=True)
    prime_location_name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(200), nullable=False)
    pin_code = db.Column(db.String(10), nullable=False)
    price_per_hour = db.Column(db.Float, nullable=False)
    number_of_spots = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    spots = db.relationship('ParkingSpot', backref='lot', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self, include_spots=False):
        data = {
            'id': self.id,
            'prime_location_name': self.prime_location_name,
            'address': self.address,
            'pin_code': self.pin_code,
            'price_per_hour': self.price_per_hour,
            'number_of_spots': self.number_of_spots,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'available_spots': self.spots.filter_by(status='A').count(),
            'occupied_spots': self.spots.filter_by(status='O').count(),
        }
        if include_spots:
            data['spots'] = [s.to_dict() for s in self.spots.order_by(ParkingSpot.spot_number).all()]
        return data


class ParkingSpot(db.Model):
    __tablename__ = 'parking_spots'
    id = db.Column(db.Integer, primary_key=True)
    lot_id = db.Column(db.Integer, db.ForeignKey('parking_lots.id'), nullable=False)
    spot_number = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(1), nullable=False, default='A')  # A=available, O=occupied
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    reservations = db.relationship('Reservation', backref='spot', lazy='dynamic')

    def to_dict(self):
        # Get current active reservation if occupied
        active_res = None
        if self.status == 'O':
            active_res = self.reservations.filter_by(leaving_timestamp=None).first()
        return {
            'id': self.id,
            'lot_id': self.lot_id,
            'spot_number': self.spot_number,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'active_reservation': active_res.to_dict() if active_res else None,
        }


class Reservation(db.Model):
    __tablename__ = 'reservations'
    id = db.Column(db.Integer, primary_key=True)
    spot_id = db.Column(db.Integer, db.ForeignKey('parking_spots.id'), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    vehicle_number = db.Column(db.String(20))
    parking_timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    leaving_timestamp = db.Column(db.DateTime, nullable=True)
    parking_cost = db.Column(db.Float, default=0.0)

    # Historical snapshot — preserve data even if lot/spot is deleted
    lot_id_at_booking = db.Column(db.Integer)
    lot_name_at_booking = db.Column(db.String(100))
    lot_address_at_booking = db.Column(db.String(200))
    price_per_hour_at_booking = db.Column(db.Float)
    spot_number_at_booking = db.Column(db.Integer)

    def calculate_cost(self):
        """Calculate parking cost based on duration and price at time of booking"""
        if self.leaving_timestamp and self.parking_timestamp:
            duration_hours = (self.leaving_timestamp - self.parking_timestamp).total_seconds() / 3600
            price = self.price_per_hour_at_booking or 0.0
            self.parking_cost = round(price * duration_hours, 2)
            db.session.commit()

    def get_lot_name(self):
        if self.lot_name_at_booking:
            return self.lot_name_at_booking
        if self.spot and self.spot.lot:
            return self.spot.lot.prime_location_name
        return '(Deleted Lot)'

    def get_lot_address(self):
        if self.lot_address_at_booking:
            return self.lot_address_at_booking
