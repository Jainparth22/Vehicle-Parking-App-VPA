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

                    email_body = f"""
                    <html><body>
                    <h2>🅿️ Vehicle Parking App — Daily Reminder</h2>
                    <p>Hi {user.full_name or 'there'},</p>
                    <p>You haven't booked a parking spot recently. Planning to drive today?
                    Visit the Parking App to find an available spot near you!</p>
                    {new_lot_html}
                    <p>Log in now to reserve your spot before they fill up!</p>
                    <p>Best regards,<br>Parking App Team</p>
                    </body></html>
                    """
                    send_email(
                        subject='🅿️ Parking App — Don\'t forget to book your spot!',
                        recipients=[user.email],
                        html_body=email_body
                    )

                # Google Chat webhook
                send_gchat_webhook(
                    f'Reminder sent to {user.email}: "You haven\'t parked in 3 days.{new_lot_info}"'
                )
                count += 1

        db.session.commit()
        return {'status': 'success', 'reminders_sent': count}
    except Exception as e:
        db.session.rollback()
        return {'status': 'error', 'message': str(e)}


@celery.task(name='tasks.generate_monthly_report')
def generate_monthly_report(job_id=None):
    """
    Monthly report task:
    - Total reservations and revenue for the month
    - Most used parking lot
    - Per-user statistics
    - Generates HTML + PDF, emails admin
    """
    job = None
    try:
        if job_id:
            job = AsyncJob.query.get(job_id)
            if job:
                job.status = 'running'
                db.session.commit()

        now = datetime.datetime.utcnow()
        month_str = now.strftime('%Y-%m')
        first_day = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if now.month == 12:
            last_day = first_day.replace(year=now.year + 1, month=1)
        else:
            last_day = first_day.replace(month=now.month + 1)

        # Get all completed reservations this month
        monthly_reservations = Reservation.query.filter(
            Reservation.parking_timestamp >= first_day,
            Reservation.parking_timestamp < last_day,
            Reservation.leaving_timestamp.isnot(None)
        ).all()

        total_reservations = len(monthly_reservations)
        total_revenue = sum(r.parking_cost for r in monthly_reservations)

        # Most used lot
        lot_counts = {}
        for res in monthly_reservations:
            lot_name = res.get_lot_name()
            lot_counts[lot_name] = lot_counts.get(lot_name, 0) + 1
        most_used_lot = max(lot_counts, key=lot_counts.get) if lot_counts else 'N/A'

        # Lot revenue table
        lot_revenue = {}
        for res in monthly_reservations:
            lot_name = res.get_lot_name()
            lot_revenue[lot_name] = lot_revenue.get(lot_name, 0) + res.parking_cost
        lot_rows = ''.join([
            f'<tr><td>{lot}</td><td>{count}</td><td>₹{lot_revenue.get(lot, 0):.2f}</td></tr>'
            for lot, count in sorted(lot_counts.items(), key=lambda x: x[1], reverse=True)
        ])

        report_html = f"""
        <html>
        <head><title>Monthly Parking Report — {month_str}</title>
        <style>
            body {{ font-family: Arial, sans-serif; padding: 20px; color: #1a1a2e; }}
            h1 {{ color: #16213e; }} h2 {{ color: #0f3460; }}
            table {{ border-collapse: collapse; width: 100%; margin-top: 15px; }}
            th, td {{ border: 1px solid #ddd; padding: 10px; text-align: left; }}
            th {{ background: #0f3460; color: white; }}
            .stat {{ font-size: 28px; font-weight: bold; color: #e94560; }}
            .card {{ background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 10px 0; display: inline-block; width: 28%; }}
        </style>
        </head>
        <body>
            <h1>🅿️ Monthly Parking Report — {month_str}</h1>
            <div>
                <div class="card"><p>Total Reservations</p><p class="stat">{total_reservations}</p></div>
                <div class="card"><p>Total Revenue</p><p class="stat">₹{total_revenue:.2f}</p></div>
                <div class="card"><p>Most Used Lot</p><p class="stat" style="font-size:18px">{most_used_lot}</p></div>
            </div>
            <h2>Parking Lot Breakdown</h2>
            <table>
                <tr><th>Parking Lot</th><th>Reservations</th><th>Revenue</th></tr>
                {lot_rows if lot_rows else '<tr><td colspan="3">No data for this month</td></tr>'}
            </table>
            <p><em>Report generated on {now.strftime('%Y-%m-%d %H:%M')} UTC</em></p>
        </body>
        </html>
        """

        # Save HTML report
        reports_dir = os.path.join(os.path.dirname(__file__), 'reports')
        os.makedirs(reports_dir, exist_ok=True)
        report_path = os.path.join(reports_dir, f'report_{month_str}.html')
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report_html)

        # Try PDF generation
        pdf_path = os.path.join(reports_dir, f'report_{month_str}.pdf')
        try:
            from xhtml2pdf import pisa
            with open(pdf_path, 'wb') as pdf_file:
                pisa.CreatePDF(report_html, dest=pdf_file)
        except Exception as pdf_err:
            print(f'PDF generation failed: {pdf_err}')
            pdf_path = None

        # Save report record
        report = MonthlyReport(
            month=month_str,
            total_reservations=total_reservations,
            total_revenue=total_revenue,
            report_path=report_path,
        )
        db.session.add(report)

        # Notify admin + send email
        admin = User.query.filter_by(role='admin').first()
        if admin:
            notification = Notification(
