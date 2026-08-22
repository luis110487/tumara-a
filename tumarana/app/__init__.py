import os
from flask import Flask
from dotenv import load_dotenv
from flask_wtf.csrf import CSRFProtect

load_dotenv()
csrf = CSRFProtect()

def create_app():
    app = Flask(__name__)
    app.config.update(
        SECRET_KEY=os.environ.get('SECRET_KEY') or os.urandom(32),
        MAX_CONTENT_LENGTH=2 * 1024 * 1024,
        SUPABASE_URL=os.environ.get('SUPABASE_URL', '').rstrip('/'),
        SUPABASE_ANON_KEY=os.environ.get('SUPABASE_ANON_KEY', ''),
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE='Lax',
        SESSION_COOKIE_SECURE=os.environ.get('SESSION_COOKIE_SECURE', 'true').lower() == 'true',
        FORCE_HTTPS=os.environ.get('FORCE_HTTPS', 'true').lower() == 'true',
    )
    csrf.init_app(app)

    @app.after_request
    def security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Permissions-Policy'] = 'geolocation=(self), microphone=(), camera=()'
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https://*.supabase.co; "
            "font-src 'self' data:; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
        )
        if app.config['FORCE_HTTPS']:
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        return response

    from .routes import main
    app.register_blueprint(main)
    return app
