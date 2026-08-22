import os
from flask import Flask
from dotenv import load_dotenv
from flask_cors import CORS

load_dotenv()

def create_app():
    app = Flask(__name__)
    app.config.update(
        SUPABASE_URL=os.environ.get('SUPABASE_URL', '').rstrip('/'),
        SUPABASE_ANON_KEY=os.environ.get('SUPABASE_ANON_KEY', ''),
        FORCE_HTTPS=os.environ.get('FORCE_HTTPS', 'true').lower() == 'true',
    )

    frontend_origins = [o.strip() for o in os.environ.get('FRONTEND_ORIGIN', 'http://localhost:5173').split(',') if o.strip()]
    CORS(app, resources={r'/api/*': {'origins': frontend_origins}}, supports_credentials=False)

    @app.after_request
    def security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Permissions-Policy'] = 'geolocation=(self), microphone=(), camera=()'
        if app.config['FORCE_HTTPS']:
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        return response

    from .routes import main
    app.register_blueprint(main)
    return app
