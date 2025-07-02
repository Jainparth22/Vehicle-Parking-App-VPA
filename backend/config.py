import os
from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, '..'))
load_dotenv(os.path.join(PROJECT_ROOT, '.env'))


class Config:
    # ── Core ──────────────────────────────────────────────────────
