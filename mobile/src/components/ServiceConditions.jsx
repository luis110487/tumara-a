import { AppIcon } from './AppIcon';
import { servicePrice } from '../lib/serviceCatalog';
export function ServiceConditions({ service, snapshot = false }) {
  if (!service) return null;
  return <section className="service-conditions" aria-label={snapshot ? 'Condiciones del servicio solicitado' : 'Condiciones del servicio'}>
    <div className="service-price"><strong>{servicePrice(service)}</strong><span>{service.price_type === 'from' ? 'Desde · COP' : 'Valor por acordar'}</span></div>
    <div className="service-facts"><div><AppIcon name="calendar" size={22} /><span>Tiempo estimado<strong>{service.duration || 'Por acordar'}</strong></span></div><div><AppIcon name="shield" size={22} /><span>Garantía<strong>{service.warranty || 'Por acordar'}</strong></span></div><div><AppIcon name="tools" size={22} /><span>Materiales<strong>{service.materials || 'Por acordar'}</strong></span></div></div>
  </section>;
}
