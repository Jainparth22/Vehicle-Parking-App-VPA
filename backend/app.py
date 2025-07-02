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
