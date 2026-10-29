export function servicePrice(service) {
  if (service?.price_type !== 'from' || service.price_cop == null || !Number.isFinite(Number(service.price_cop))) return 'A convenir';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(Number(service.price_cop));
}
export function serviceIncludes(service) { return Array.isArray(service?.includes) ? service.includes.filter(item => typeof item === 'string' && item.trim()) : []; }
