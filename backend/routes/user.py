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
