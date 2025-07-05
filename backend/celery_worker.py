import os
from celery import Celery

celery = Celery(
    'vpa',
    broker=os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/1'),
    backend=os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/1'),
    include=['tasks']
)

from celery.schedules import crontab

celery.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Asia/Kolkata',
    enable_utc=True,
    beat_schedule={
        'daily-reminders': {
            'task': 'tasks.send_daily_reminders',
            'schedule': crontab(hour=18, minute=0),  # Every day at 6:00 PM IST
        },
        'monthly-report': {
            'task': 'tasks.generate_monthly_report',
            'schedule': crontab(day_of_month=1, hour=0, minute=0),  # 1st of every month at midnight
        },
    },
)


def init_celery(app):
    """Set up Celery to use Flask app context"""
    celery.conf.update(
        broker_url=app.config.get('CELERY_BROKER_URL', 'redis://localhost:6379/1'),
        result_backend=app.config.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/1'),
    )

    class ContextTask(celery.Task):
        abstract = True

        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask
    return celery


# When running as Celery worker (not via Flask), create the app context
try:
    from app import create_app
