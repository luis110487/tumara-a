import os
from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException
from dotenv import load_dotenv
from flask_cors import CORS
from .security import init_security

load_dotenv()

def create_app():
    app = Flask(__name__)
    app.config.update(
        SUPABASE_URL=os.environ.get('SUPABASE_URL', '').rstrip('/'),
        SUPABASE_ANON_KEY=os.environ.get('SUPABASE_ANON_KEY', ''),
        FORCE_HTTPS=os.environ.get('FORCE_HTTPS', 'true').lower() == 'true',
        # Solo para depurar: expone el detalle interno de los errores en las respuestas.
        EXPOSE_ERRORS=os.environ.get('EXPOSE_ERRORS', 'false').lower() == 'true',
    )

    frontend_origins = [o.strip() for o in os.environ.get('FRONTEND_ORIGIN', 'http://localhost:5173').split(',') if o.strip()]
    CORS(app, resources={r'/api/*': {'origins': frontend_origins, 'methods': ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'], 'allow_headers': ['Authorization', 'Content-Type'], 'max_age': 600}}, supports_credentials=False)
    init_security(app)

    @app.after_request
    def security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Permissions-Policy'] = 'geolocation=(self), microphone=(), camera=()'
        if app.config['FORCE_HTTPS']:
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        return response

    @app.errorhandler(HTTPException)
    def json_http_error(e):
        return jsonify({'error': e.description or e.name}), e.code

    from .routes import main
    app.register_blueprint(main)
    from .service_catalog import catalog
    app.register_blueprint(catalog)
    from .seo import seo
    app.register_blueprint(seo)
    return app
