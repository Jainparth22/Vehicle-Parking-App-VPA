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
