export function WhatsappButton({ whatsapp, professionalName }) {
  if (!whatsapp) return null;
  const digits = whatsapp.replace(/[^0-9]/g, '');
  const text = encodeURIComponent(`Hola ${professionalName || ''}, te contacto desde TuMaraña.com`.trim());
  return (
    <a className="btn whatsapp" href={`https://wa.me/${digits}?text=${text}`} target="_blank" rel="noopener noreferrer">
      ⬤ Contactar por WhatsApp
    </a>
  );
}
