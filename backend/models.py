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
