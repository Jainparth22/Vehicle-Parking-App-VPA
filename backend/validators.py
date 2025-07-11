import re

# Input validators for Vehicle Parking App


def validate_email(email):
    """Check if email looks valid"""
    if not email or not isinstance(email, str):
        return False
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email.strip()))


def validate_password(password):
    if not password or len(password) < 6:
        return False, 'Password must be at least 6 characters'
    if len(password) > 128:
        return False, 'Password too long'
    return True, None


def validate_phone(phone):
    if not phone:
        return True, None  # optional
    phone = phone.strip()
    cleaned = re.sub(r'[\s\-\(\)\+]', '', phone)
    if not cleaned.isdigit():
        return False, 'Phone number should contain only digits'
    if len(cleaned) < 7 or len(cleaned) > 15:
        return False, 'Phone number should be 7-15 digits'
    return True, None


def validate_pin_code(pin_code):
    if not pin_code:
        return False, 'PIN code is required'
    pin_code = pin_code.strip()
    if not pin_code.isdigit() or len(pin_code) != 6:
        return False, 'PIN code must be exactly 6 digits'
    return True, None


def validate_name(name, field='Name'):
    if not name or not name.strip():
        return False, f'{field} is required'
    if len(name.strip()) < 2:
