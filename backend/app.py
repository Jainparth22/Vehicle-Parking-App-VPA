import os
from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
from flask_mail import Mail
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

from config import Config
from models import db, User, Notification, AsyncJob
from auth import generate_token, get_current_user, login_required
from cache import cache_get, cache_set, cache_delete
from validators import validate_email, validate_password

mail = Mail()


def create_app():
    app = Flask(
        __name__,
        static_folder=os.path.join(os.path.dirname(__file__), '..', 'frontend', 'static'),
        template_folder=os.path.join(os.path.dirname(__file__), '..', 'frontend', 'templates')
    )
    app.config.from_object(Config)

    # Init extensions
    db.init_app(app)
    mail.init_app(app)
    CORS(app, resources={r'/api/*': {'origins': '*'}})

    # Register blueprints
    from routes.admin import admin_bp
    from routes.user import user_bp
    app.register_blueprint(admin_bp)
    app.register_blueprint(user_bp)

    # Init Celery
    try:
        from celery_worker import init_celery
        init_celery(app)
    except Exception as e:
        print(f'[!] Celery init failed: {e} — async tasks won\'t work')

    # Create tables and seed admin
    with app.app_context():
        os.makedirs(os.path.join(app.config.get('UPLOAD_FOLDER', 'exports')), exist_ok=True)
        os.makedirs('instance', exist_ok=True)
        os.makedirs('exports', exist_ok=True)
        os.makedirs('reports', exist_ok=True)

        db.create_all()

        # Auto-create admin if not exists
        admin = User.query.filter_by(role='admin').first()
        if not admin:
            admin = User(
                email=app.config['ADMIN_EMAIL'],
                password_hash=generate_password_hash(app.config['ADMIN_PASSWORD']),
                role='admin',
                full_name='Admin',
                is_active=True,
            )
            db.session.add(admin)
            db.session.commit()
            print(f"[+] Admin user created: {app.config['ADMIN_EMAIL']}")

    # ── Auth Routes ───────────────────────────────────────────────

    @app.route('/api/auth/login', methods=['POST'])
    def login():
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        email = data.get('email', '').strip()
        password = data.get('password', '').strip()

        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400

        if not validate_email(email):
            return jsonify({'error': 'Invalid email format'}), 400

        user = User.query.filter_by(email=email).first()
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({'error': 'Invalid email or password'}), 401

        if not user.is_active:
            return jsonify({'error': 'Account is deactivated. Contact admin.'}), 403

        user.last_login = datetime.utcnow()
        db.session.commit()

        token = generate_token(user)
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': user.to_dict(),
        }), 200

    @app.route('/api/auth/register', methods=['POST'])
    def register():
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        email = data.get('email', '').strip()
        password = data.get('password', '').strip()
        full_name = data.get('full_name', '').strip()

        if not all([email, password, full_name]):
            return jsonify({'error': 'Email, password, and full name are required'}), 400

        if not validate_email(email):
            return jsonify({'error': 'Invalid email format'}), 400

        ok, err = validate_password(password)
        if not ok:
            return jsonify({'error': err}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already registered'}), 409

        user = User(
            email=email,
            password_hash=generate_password_hash(password),
            role='user',
            full_name=full_name,
            address=data.get('address', ''),
            pin_code=data.get('pin_code', ''),
            is_active=True,
        )
        db.session.add(user)
        db.session.commit()

        token = generate_token(user)
        return jsonify({
            'message': 'Registration successful',
            'token': token,
            'user': user.to_dict(),
        }), 201

    @app.route('/api/auth/logout', methods=['POST'])
    @login_required
    def logout(user):
        return jsonify({'message': 'Logged out successfully'}), 200

    @app.route('/api/auth/me', methods=['GET'])
    @login_required
    def current_user_info(user):
        return jsonify({'user': user.to_dict()}), 200

    @app.route('/api/auth/me', methods=['PUT'])
    @login_required
    def update_profile(user):
        data = request.json or {}
        if data.get('full_name'):
            user.full_name = data['full_name'].strip()
        if data.get('address'):
            user.address = data['address'].strip()
        if data.get('pin_code'):
            user.pin_code = data['pin_code'].strip()
        db.session.commit()
        return jsonify({'message': 'Profile updated', 'user': user.to_dict()}), 200

    # ── Notification Routes ───────────────────────────────────────

    @app.route('/api/notifications', methods=['GET'])
    @login_required
    def get_notifications(user):
        notifications = Notification.query.filter_by(user_id=user.id).order_by(
            Notification.created_at.desc()
        ).limit(50).all()
        return jsonify([n.to_dict() for n in notifications]), 200

    @app.route('/api/notifications/<int:id>/read', methods=['PUT'])
    @login_required
    def mark_notification_read(user, id):
        notification = Notification.query.get_or_404(id)
        if notification.user_id != user.id:
            return jsonify({'error': 'Unauthorized'}), 403
        notification.is_read = True
        db.session.commit()
        return jsonify({'message': 'Notification marked as read'}), 200

    @app.route('/api/notifications/read-all', methods=['PUT'])
    @login_required
    def mark_all_read(user):
        Notification.query.filter_by(user_id=user.id, is_read=False).update({'is_read': True})
        db.session.commit()
        return jsonify({'message': 'All notifications marked as read'}), 200

    # ── Async Job Status ──────────────────────────────────────────

    @app.route('/api/jobs/<int:job_id>', methods=['GET'])
