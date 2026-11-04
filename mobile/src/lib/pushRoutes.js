export function safePushPath(value) {
  return typeof value === 'string' && /^\/(solicitud\/[0-9]+\/chat(?:\?review=1)?|profesional\/[0-9]+|mi-perfil-profesional|mis-solicitudes|notificaciones|admin\/profesionales)$/.test(value) ? value : null;
}
