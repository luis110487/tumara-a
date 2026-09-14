// Estado que se manda a /cuenta para volver a esta misma página al iniciar sesión.
export function loginRedirectState() {
  return { state: { from: window.location.pathname + window.location.search } };
}
