import base64
import hashlib
import hmac
import os
import time


class InvalidActionToken(RuntimeError):
    pass


def _secret():
    secret = os.environ.get('ACTION_TOKEN_SECRET', '') or os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
    if not secret:
        raise InvalidActionToken('ACTION_TOKEN_SECRET no está configurada en el servidor')
    return secret.encode()


def _b64(raw):
    return base64.urlsafe_b64encode(raw).decode().rstrip('=')


def _unb64(text):
    return base64.urlsafe_b64decode(text + '=' * (-len(text) % 4))


def make_action_token(action, request_id, user_id, ttl_days=30):
    payload = f'{action}:{request_id}:{user_id}:{int(time.time()) + ttl_days * 86400}'.encode()
    sig = hmac.new(_secret(), payload, hashlib.sha256).digest()
    return f'{_b64(payload)}.{_b64(sig)}'


def read_action_token(token, action):
    try:
        payload_b64, sig_b64 = str(token).split('.', 1)
        payload = _unb64(payload_b64)
        expected = hmac.new(_secret(), payload, hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _unb64(sig_b64)):
            raise InvalidActionToken('Enlace inválido')
        token_action, request_id, user_id, expires = payload.decode().split(':', 3)
    except InvalidActionToken:
        raise
    except Exception:
        raise InvalidActionToken('Enlace inválido')
    if token_action != action:
        raise InvalidActionToken('Enlace inválido')
    if int(expires) < time.time():
        raise InvalidActionToken('El enlace expiró. Ingresa a TuMaraña.com para aceptar la solicitud.')
    return int(request_id), user_id
