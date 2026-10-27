import { COLOMBIA } from '../data/colombia.js';

function normalized(value) {
  let text = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ').replace(/^municipio de /, '').replace(/\s+/g, ' ').trim();
  if (/^bogota( d c| distrito capital)?$/.test(text)) text = 'bogota';
  if (text === 'cartagena') text = 'cartagena de indias';
  return text;
}

export function cityFromGps(data) {
  if (data?.countryCode?.toUpperCase() !== 'CO' || !Array.isArray(data?.candidates)) return '';
  for (const candidate of data.candidates) {
    const target = normalized(candidate);
    for (const department of COLOMBIA) {
      const match = department.municipios.find(city => normalized(city) === target);
      if (match) return match;
    }
  }
  return '';
}

export function gpsFeedback(code) {
  if (code === 'LOCATION_DENIED') return 'Permite el acceso a ubicación o elige tu ciudad manualmente.';
  if (code === 'LOCATION_DISABLED') return 'Activa la ubicación del móvil o elige tu ciudad manualmente.';
  if (code === 'NO_CITY') return 'No pudimos identificar un municipio disponible. Elige tu ciudad manualmente.';
  if (code === 'LOCATION_TIMEOUT') return 'La ubicación está tardando. Vuelve a intentar o elige tu ciudad.';
  return 'No pudimos obtener tu ubicación. Puedes elegir la ciudad manualmente.';
}
