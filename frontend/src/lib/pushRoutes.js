export function safePushPath(value) {
  return typeof value === 'string' && /^\/(solicitud\/[0-9]+\/chat|mi-perfil-profesional|mis-solicitudes|admin\/profesionales)$/.test(value) ? value : null;
}
