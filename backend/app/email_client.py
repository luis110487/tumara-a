import os
import requests

RESEND_API_URL = 'https://api.resend.com/emails'


def send_email(to_email, subject, html):
    api_key = os.environ.get('RESEND_API_KEY', '')
    from_email = os.environ.get('RESEND_FROM_EMAIL', 'onboarding@resend.dev')
    if not api_key or not to_email:
        return False
    try:
        r = requests.post(
            RESEND_API_URL,
            headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
            json={'from': from_email, 'to': [to_email], 'subject': subject, 'html': html},
            timeout=10,
        )
        return r.status_code < 400
    except requests.RequestException:
        return False


def send_professional_approved_email(to_email, display_name):
    html = f'''
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#092653">¡Tu perfil fue aprobado!</h2>
      <p>Hola {display_name},</p>
      <p>Buenas noticias: tu perfil profesional en <b>TuMaraña.com</b> fue revisado y aprobado por un administrador.</p>
      <p>Ya apareces públicamente y los clientes pueden encontrarte y contactarte para solicitar tus servicios.</p>
      <p style="margin-top:24px;color:#6d7c8e;font-size:12px">TuMaraña.com — Conectamos necesidades con habilidades</p>
    </div>
    '''
    return send_email(to_email, '¡Tu perfil profesional fue aprobado! - TuMaraña.com', html)


def send_welcome_email(to_email, full_name):
    html = f'''
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#092653">¡Bienvenido a TuMaraña.com!</h2>
      <p>Hola {full_name},</p>
      <p>Tu cuenta fue creada correctamente. Ya puedes buscar profesionales confiables para tus necesidades o registrar tu actividad profesional.</p>
      <p style="margin-top:24px;color:#6d7c8e;font-size:12px">TuMaraña.com — Conectamos necesidades con habilidades</p>
    </div>
    '''
    return send_email(to_email, 'Bienvenido a TuMaraña.com', html)


def send_professional_rejected_email(to_email, display_name):
    html = f'''
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#092653">Tu perfil profesional no fue aprobado</h2>
      <p>Hola {display_name},</p>
      <p>Revisamos tu perfil profesional en <b>TuMaraña.com</b> y no fue aprobado en esta ocasión.</p>
      <p>Puedes editar tu perfil desde "Mi perfil profesional" y esperar una nueva revisión.</p>
      <p style="margin-top:24px;color:#6d7c8e;font-size:12px">TuMaraña.com — Conectamos necesidades con habilidades</p>
    </div>
    '''
    return send_email(to_email, 'Tu perfil profesional no fue aprobado - TuMaraña.com', html)


def send_new_request_email(to_email, professional_name, customer_name, service_title):
    html = f'''
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#092653">¡Nueva solicitud de servicio!</h2>
      <p>Hola {professional_name},</p>
      <p><b>{customer_name}</b> te envió una solicitud: <b>{service_title}</b>.</p>
      <p>Ingresa a TuMaraña.com para revisar los detalles y conversar con el cliente.</p>
      <p style="margin-top:24px;color:#6d7c8e;font-size:12px">TuMaraña.com — Conectamos necesidades con habilidades</p>
    </div>
    '''
    return send_email(to_email, 'Nueva solicitud de servicio - TuMaraña.com', html)


STATUS_LABELS = {
    'requested': 'Solicitada',
    'in_conversation': 'En conversación',
    'quoted': 'Cotizada',
    'accepted': 'Aceptada',
    'in_progress': 'En progreso',
    'completed': 'Completada',
    'cancelled': 'Cancelada',
}


def send_status_change_email(to_email, recipient_name, service_title, status):
    label = STATUS_LABELS.get(status, status)
    html = f'''
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#092653">Actualización de tu solicitud</h2>
      <p>Hola {recipient_name},</p>
      <p>Tu solicitud <b>{service_title}</b> cambió de estado a: <b>{label}</b>.</p>
      <p>Ingresa a TuMaraña.com para ver los detalles y continuar la conversación.</p>
      <p style="margin-top:24px;color:#6d7c8e;font-size:12px">TuMaraña.com — Conectamos necesidades con habilidades</p>
    </div>
    '''
    return send_email(to_email, f'Tu solicitud está: {label} - TuMaraña.com', html)


def send_new_review_email(to_email, professional_name, rating, comment):
    stars = '★' * rating + '☆' * (5 - rating)
    comment_html = f'<p style="color:#6d7c8e">"{comment}"</p>' if comment else ''
    html = f'''
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#092653">¡Recibiste una nueva calificación!</h2>
      <p>Hola {professional_name},</p>
      <p style="font-size:20px;color:#f0a400;letter-spacing:2px">{stars}</p>
      {comment_html}
      <p>Ingresa a TuMaraña.com para ver tu perfil actualizado.</p>
      <p style="margin-top:24px;color:#6d7c8e;font-size:12px">TuMaraña.com — Conectamos necesidades con habilidades</p>
    </div>
    '''
    return send_email(to_email, 'Nueva calificación recibida - TuMaraña.com', html)
