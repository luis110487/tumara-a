import html as html_mod
import os
import re
import requests

RESEND_API_URL = 'https://api.resend.com/emails'
APP_BASE_URL = os.environ.get('APP_BASE_URL', 'https://tumara-a.vercel.app').rstrip('/')
LOGO_URL = f'{APP_BASE_URL}/logo-tumarana.jpeg'

FOOTER_TEXT = (
    'Recibes este correo porque tienes una cuenta en TuMaraña.com; es una notificación '
    'automática sobre tu actividad en la plataforma. Si no reconoces esta actividad, '
    'puedes ignorar el mensaje.'
)
SIGNATURE = 'TuMaraña.com — Conectamos necesidades con habilidades'


def app_url(path=''):
    return f'{APP_BASE_URL}/{path.lstrip("/")}' if path else APP_BASE_URL


def chat_url(request_id):
    return app_url(f'/solicitud/{request_id}/chat')


def button(url, label, color='#e29b12'):
    return f'''
    <p style="text-align:center;margin:26px 0">
      <a href="{url}" style="display:inline-block;background:{color};color:#ffffff;text-decoration:none;font-weight:bold;padding:13px 26px;border-radius:8px">{label}</a>
    </p>
    <p style="text-align:center;font-size:12px;color:#6d7c8e">Si el botón no funciona, copia este enlace:<br /><a href="{url}" style="color:#092653">{url}</a></p>
    '''


def support_line():
    email = os.environ.get('SUPPORT_EMAIL', '').strip()
    return f'¿Necesitas ayuda? Escríbenos a {email}.' if email else ''


def html_to_text(raw):
    """Convierte el HTML del correo en una versión legible en texto plano."""
    text = re.sub(r'(?is)<(script|style).*?</\1>', '', raw)
    # Los enlaces quedan como "etiqueta: url" para que sigan siendo usables;
    # si la etiqueta ya es la propia url, se deja una sola vez.
    def link(m):
        url, label = m.group(1), re.sub(r'(?s)<[^>]+>', '', m.group(2)).strip()
        return url if not label or label == url else f'{label}: {url}'

    text = re.sub(r'(?is)<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>', link, text)
    text = re.sub(r'(?i)<br\s*/?>', '\n', text)
    text = re.sub(r'(?i)</(p|div|h1|h2|h3|li|tr)>', '\n', text)
    text = re.sub(r'(?i)<hr[^>]*>', '\n---\n', text)
    text = re.sub(r'(?s)<[^>]+>', '', text)
    text = html_mod.unescape(text)
    text = re.sub(r'[ \t]+', ' ', text)
    text = '\n'.join(line.strip() for line in text.splitlines())
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def send_email(to_email, subject, html):
    api_key = os.environ.get('RESEND_API_KEY', '')
    from_email = os.environ.get('RESEND_FROM_EMAIL', 'onboarding@resend.dev')
    if not api_key or not to_email:
        return False
    support = support_line()
    support_html = f'<br />{support}' if support else ''
    wrapped = f'''
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
      <div style="text-align:center;padding-bottom:18px">
        <img src="{LOGO_URL}" alt="TuMaraña.com" style="height:44px;width:auto" />
      </div>
      {html}
      <hr style="border:0;border-top:1px solid #e2e8f0;margin:28px 0 14px" />
      <p style="color:#6d7c8e;font-size:12px;line-height:1.6;margin:0">{FOOTER_TEXT}{support_html}</p>
      <p style="color:#6d7c8e;font-size:12px;margin:10px 0 0"><a href="{APP_BASE_URL}" style="color:#092653">{SIGNATURE}</a></p>
    </div>
    '''
    try:
        r = requests.post(
            RESEND_API_URL,
            headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
            json={
                'from': from_email,
                'to': [to_email],
                'subject': subject,
                'html': wrapped,
                'text': html_to_text(wrapped),
            },
            timeout=10,
        )
        return r.status_code < 400
    except requests.RequestException:
        return False


def send_professional_approved_email(to_email, display_name):
    html = f'''
    <h2 style="color:#092653">¡Tu perfil fue aprobado!</h2>
    <p>Hola {display_name},</p>
    <p>Buenas noticias: tu perfil profesional en <b>TuMaraña.com</b> fue revisado y aprobado por un administrador.</p>
    <p>Ya apareces públicamente y los clientes pueden encontrarte y contactarte para solicitar tus servicios.</p>
    {button(app_url('/mi-perfil-profesional'), 'Ver mi perfil profesional')}
    '''
    return send_email(to_email, '¡Tu perfil profesional fue aprobado! - TuMaraña.com', html)


def send_welcome_email(to_email, full_name):
    html = f'''
    <h2 style="color:#092653">¡Bienvenido a TuMaraña.com!</h2>
    <p>Hola {full_name},</p>
    <p>Tu cuenta fue creada correctamente. Ya puedes buscar profesionales confiables para tus necesidades o registrar tu actividad profesional.</p>
    {button(app_url('/'), 'Entrar a TuMaraña.com')}
    '''
    return send_email(to_email, 'Bienvenido a TuMaraña.com', html)


def send_professional_rejected_email(to_email, display_name):
    html = f'''
    <h2 style="color:#092653">Tu perfil profesional no fue aprobado</h2>
    <p>Hola {display_name},</p>
    <p>Revisamos tu perfil profesional en <b>TuMaraña.com</b> y no fue aprobado en esta ocasión.</p>
    <p>Puedes editar tu perfil y esperar una nueva revisión.</p>
    {button(app_url('/mi-perfil-profesional'), 'Editar mi perfil profesional')}
    '''
    return send_email(to_email, 'Tu perfil profesional no fue aprobado - TuMaraña.com', html)


def send_new_request_email(to_email, professional_name, customer_name, service_title, request_id=None, accept_url=None):
    cta = ''
    if accept_url:
        cta += button(accept_url, '✓ Aceptar solicitud', '#16a34a')
    if request_id:
        cta += button(chat_url(request_id), 'Ver solicitud y responder')
    html = f'''
    <h2 style="color:#092653">¡Nueva solicitud de servicio!</h2>
    <p>Hola {professional_name},</p>
    <p><b>{customer_name}</b> te envió una solicitud: <b>{service_title}</b>.</p>
    <p>Puedes <b>aceptarla de una vez</b> con el botón verde, o entrar a la conversación para ver los detalles y responderle al cliente antes de decidir.</p>
    {cta}
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


def send_status_change_email(to_email, recipient_name, service_title, status, request_id=None):
    label = STATUS_LABELS.get(status, status)
    cta = button(chat_url(request_id), 'Ver la solicitud') if request_id else ''
    html = f'''
    <h2 style="color:#092653">Actualización de tu solicitud</h2>
    <p>Hola {recipient_name},</p>
    <p>Tu solicitud <b>{service_title}</b> cambió de estado a: <b>{label}</b>.</p>
    <p>Abre la conversación para ver los detalles y continuar.</p>
    {cta}
    '''
    return send_email(to_email, f'Tu solicitud está: {label} - TuMaraña.com', html)


def send_new_message_email(to_email, recipient_name, sender_name, service_title, body, request_id=None):
    preview = body[:200] + ('…' if len(body) > 200 else '')
    cta = button(chat_url(request_id), 'Responder mensaje') if request_id else ''
    html = f'''
    <h2 style="color:#092653">Nuevo mensaje en tu solicitud</h2>
    <p>Hola {recipient_name},</p>
    <p><b>{sender_name}</b> te escribió en la solicitud <b>{service_title}</b>:</p>
    <p style="background:#f8fafc;border-radius:8px;padding:12px 14px;color:#334155">"{preview}"</p>
    {cta}
    '''
    return send_email(to_email, f'{sender_name} te escribió - TuMaraña.com', html)


def send_new_review_email(to_email, professional_name, rating, comment):
    stars = '★' * rating + '☆' * (5 - rating)
    comment_html = f'<p style="color:#6d7c8e">"{comment}"</p>' if comment else ''
    html = f'''
    <h2 style="color:#092653">¡Recibiste una nueva calificación!</h2>
    <p>Hola {professional_name},</p>
    <p style="font-size:20px;color:#f0a400;letter-spacing:2px">{stars}</p>
    {comment_html}
    {button(app_url('/mi-perfil-profesional'), 'Ver mi perfil profesional')}
    '''
    return send_email(to_email, 'Nueva calificación recibida - TuMaraña.com', html)
