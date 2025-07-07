import csv
import os
import datetime
from celery_worker import celery
from models import db, User, ParkingLot, Reservation, MonthlyReport, Notification, AsyncJob


def send_email(subject, recipients, html_body):
    """Send email via Flask-Mail"""
    try:
        from app import mail
        from flask_mail import Message
        msg = Message(subject=subject, recipients=recipients, html=html_body)
        mail.send(msg)
        return True
    except Exception as e:
        print(f'Email sending failed: {e}')
        return False


def send_gchat_webhook(message):
    """Send notification to Google Chat space"""
    try:
        import requests
        from flask import current_app
        webhook_url = current_app.config.get('GCHAT_WEBHOOK_URL', '') or os.environ.get('GCHAT_WEBHOOK_URL', '')
        if webhook_url:
            requests.post(webhook_url, json={'text': message}, timeout=10)
            return True
    except Exception as e:
        print(f'Google Chat webhook failed: {e}')
    return False


@celery.task(name='tasks.send_daily_reminders')
def send_daily_reminders():
    """
    Daily reminder task:
    - Checks users who haven't made a reservation recently
    - Checks if admin created new lots
    - Sends reminder via email + Google Chat webhook
    """
    try:
        now = datetime.datetime.utcnow()
        three_days_ago = now - datetime.timedelta(days=3)

        # Get all active regular users
        users = User.query.filter_by(role='user', is_active=True).all()

        # Get lots created in the last 24 hours (new lots to promote)
        new_lots = ParkingLot.query.filter(
            ParkingLot.created_at >= now - datetime.timedelta(hours=24)
        ).all()

        count = 0
        for user in users:
            # Check if user has parked recently
            recent_reservation = Reservation.query.filter(
                Reservation.user_id == user.id,
                Reservation.parking_timestamp >= three_days_ago
            ).first()

            if not recent_reservation:
                # Build message
                new_lot_info = ''
                if new_lots:
                    lot_list = ', '.join([f'"{l.prime_location_name}" ({l.pin_code})' for l in new_lots[:3]])
                    new_lot_info = f' New parking lots are available: {lot_list}.'

                message_text = (
                    f"Hi {user.full_name or user.email}! You haven't parked in the last 3 days. "
                    f"Visit the Parking App to find and book a spot near you!{new_lot_info}"
                )

                # In-app notification
                notification = Notification(
                    user_id=user.id,
                    message=message_text,
                    channel='in-app',
                    is_sent=True,
                )
                db.session.add(notification)

                # Email
                if user.email:
                    new_lot_html = ''
                    if new_lots:
                        lot_items = ''.join([
                            f'<li><strong>{l.prime_location_name}</strong> — {l.address} (PIN: {l.pin_code}) — ₹{l.price_per_hour}/hr</li>'
                            for l in new_lots[:5]
                        ])
                        new_lot_html = f'<h3>🆕 New Parking Lots Available</h3><ul>{lot_items}</ul>'
