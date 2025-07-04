#!/usr/bin/env python3
"""
run.py — Vehicle Parking App entry point

Usage:
  python run.py              # Development server (port 5002)
  python run.py --prod       # Production (gunicorn)

Background workers:
  cd backend
  celery -A celery_worker.celery worker --loglevel=info
  celery -A celery_worker.celery beat   --loglevel=info
"""

import os
import sys

os.chdir(os.path.join(os.path.dirname(__file__), 'backend'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app import app

if __name__ == '__main__':
    if '--prod' in sys.argv:
        print('[*] Starting production server via gunicorn on port 5002...')
        os.execvp('gunicorn', ['gunicorn', '-w', '4', '-b', '0.0.0.0:5002', 'app:app'])
    else:
        print('[*] Starting development server on http://localhost:5002')
        print('[*] Admin login: see ADMIN_EMAIL and ADMIN_PASSWORD in .env')
