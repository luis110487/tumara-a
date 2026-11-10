"""Endurecimiento de la API: límite de peticiones, errores controlados y cabeceras.

El límite de peticiones vive en memoria de cada proceso. Con varios procesos de gunicorn el
límite efectivo es un poco más alto, pero frena abusos y fuerza bruta sin añadir dependencias.
"""
import hashlib
import logging
import re
import threading
import time
from collections import defaultdict, deque

import requests
from flask import jsonify, request

from .supabase_client import SupabaseError

log = logging.getLogger('tumarana.security')

# (método, expresión de la ruta, máximo de peticiones, ventana en segundos)
RULES = [
    ('POST', re.compile(r'^/api/requests$'), 10, 600),
    ('POST', re.compile(r'^/api/requests/\d+/messages$'), 40, 60),
    ('POST', re.compile(r'^/api/requests/\d+/review$'), 10, 600),
    ('POST', re.compile(r'^/api/welcome-email$'), 3, 600),
    ('POST', re.compile(r'^/api/professionals$'), 10, 600),
    ('POST', re.compile(r'^/api/admin/users/(create-admin|promote|[^/]+/reset-password)$'), 10, 600),
    ('POST', re.compile(r'^/api/push/test$'), 6, 600),
    ('GET', re.compile(r'^/api/solicitudes/aceptar$'), 20, 600),
]
GLOBAL_LIMIT = (300, 60)  # peticiones por minuto a /api por cliente

MESSAGE_429 = 'Demasiadas solicitudes. Espera unos minutos e inténtalo de nuevo.'
MESSAGE_503 = 'El servicio no está disponible temporalmente. Inténtalo de nuevo en un momento.'
MESSAGE_500 = 'Ocurrió un error inesperado. Inténtalo de nuevo.'


class SlidingWindowLimiter:
    def __init__(self):
        self._hits = defaultdict(deque)
        self._lock = threading.Lock()
        self._calls = 0

    def hit(self, key, limit, window, now=None):
        """Registra una petición. Devuelve (permitida, segundos_para_reintentar)."""
        now = time.monotonic() if now is None else now
        with self._lock:
            queue = self._hits[key]
            while queue and now - queue[0] >= window:
                queue.popleft()
            if len(queue) >= limit:
                return False, max(1, int(window - (now - queue[0])) + 1)
            queue.append(now)
            self._calls += 1
            if self._calls % 2000 == 0:
                self._prune(now)
            return True, 0

    def _prune(self, now):
        # Evita que el diccionario crezca sin límite con claves que ya no se usan.
        for key in [k for k, q in self._hits.items() if not q or now - q[-1] > 3600]:
            del self._hits[key]

    def clear(self):
        with self._lock:
            self._hits.clear()


limiter = SlidingWindowLimiter()


def client_key():
    """Identifica al cliente: por sesión si hay token, y si no por IP (la primera de X-Forwarded-For)."""
    auth = request.headers.get('Authorization', '')
    if auth.startswith('Bearer ') and len(auth) > 20:
        return 'u:' + hashlib.sha256(auth.encode()).hexdigest()[:16]
    forwarded = request.headers.get('X-Forwarded-For', '')
    ip = forwarded.split(',')[0].strip() if forwarded else (request.remote_addr or 'desconocido')
    return 'ip:' + ip


def _too_many(retry_after):
    response = jsonify({'error': MESSAGE_429})
    response.status_code = 429
    response.headers['Retry-After'] = str(retry_after)
    return response


def init_security(app):
    app.config.setdefault('RATE_LIMIT_ENABLED', True)
    # Flask define MAX_CONTENT_LENGTH como None por defecto, así que setdefault no serviría.
    if not app.config.get('MAX_CONTENT_LENGTH'):
        app.config['MAX_CONTENT_LENGTH'] = 2 * 1024 * 1024

    @app.before_request
    def reject_oversized():
        # Se rechaza antes de autenticar, para no gastar una consulta a Supabase con cuerpos enormes.
        maximum = app.config.get('MAX_CONTENT_LENGTH')
        if maximum and request.content_length and request.content_length > maximum:
            return jsonify({'error': 'La solicitud es demasiado grande.'}), 413
        return None

    @app.before_request
    def enforce_rate_limits():
        if not app.config['RATE_LIMIT_ENABLED'] or request.method == 'OPTIONS' or not request.path.startswith('/api/'):
            return None
        key = client_key()
        allowed, retry = limiter.hit(f'global:{key}', *GLOBAL_LIMIT)
        if not allowed:
            return _too_many(retry)
        for method, pattern, limit, window in RULES:
            if request.method == method and pattern.match(request.path):
                allowed, retry = limiter.hit(f'{pattern.pattern}:{key}', limit, window)
                if not allowed:
                    log.warning('Límite excedido en %s %s', request.method, request.path)
                    return _too_many(retry)
        return None

    @app.after_request
    def api_headers(response):
        response.headers.setdefault('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")
        response.headers.setdefault('Cross-Origin-Opener-Policy', 'same-origin')
        if request.path != '/sitemap.xml':
            response.headers.setdefault('X-Robots-Tag', 'noindex, nofollow')
        if request.headers.get('Authorization'):
            response.headers['Cache-Control'] = 'no-store'
        response.headers.add('Vary', 'Authorization')
        return response

    @app.errorhandler(SupabaseError)
    def supabase_unavailable(error):
        log.warning('Error de Supabase sin controlar: %s', error)
        return jsonify({'error': MESSAGE_503}), 502

    @app.errorhandler(requests.RequestException)
    def network_error(error):
        log.warning('Error de red: %s', error)
        return jsonify({'error': MESSAGE_503}), 503

    @app.errorhandler(Exception)
    def unexpected(error):
        log.exception('Error inesperado en %s %s', request.method, request.path)
        return jsonify({'error': MESSAGE_500}), 500
