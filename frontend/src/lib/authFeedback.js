export function authFeedback(error) {
  const code = error?.code || '';
  const message = (error?.message || '').toLowerCase();
  if (/error sending.*email|smtp|email_address_not_authorized/.test(message + ' ' + code)) return 'El servicio de correo no pudo enviar el enlace. Debe revisarse la configuración SMTP de Supabase. Tu contraseña no ha cambiado.';
  if (code === 'invalid_credentials' || message.includes('invalid login')) return 'El correo o la contraseña no son correctos. Revisa tus datos.';
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) return 'Confirma tu correo con el enlace que recibiste antes de iniciar sesión.';
  if (message.includes('already registered') || code === 'user_already_exists') return 'Este correo ya tiene una cuenta. Inicia sesión o recupera tu contraseña.';
  if (error?.status === 429 || message.includes('rate limit') || message.includes('too many')) return 'Has realizado varios intentos. Espera unos minutos y vuelve a probar.';
  if (code === 'weak_password' || message.includes('password should')) return 'Elige una contraseña más segura, con al menos 8 caracteres.';
  if (message.includes('fetch') || message.includes('network') || message.includes('timeout') || message.includes('aborted') || error?.name === 'AbortError') return 'No pudimos conectar. Revisa tu conexión y vuelve a intentarlo.';
  return 'No pudimos completar la operación. Inténtalo de nuevo en unos momentos.';
}

export function safeAuthDestination(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !/[\\\r\n]/.test(value)
    && !/^\/(cuenta|restablecer-contrasena)(\/|\?|#|$)/.test(value) ? value : '/';
}
