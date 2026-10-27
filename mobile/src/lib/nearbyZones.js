import coordinates from '../data/municipalityCoordinates.json' with { type: 'json' };
import { searchText } from './searchText.js';

const key = value => {
  const name = searchText(value).replace(/[^a-z0-9]/g, '');
  if (['bogota', 'bogotadc', 'bogotadistritocapital'].includes(name)) return 'bogotadc';
  if (['cartagena', 'cartagenadeindias'].includes(name)) return 'cartagena';
  return name;
};
const places = new Map();
coordinates.forEach(([name, department, lat, lon]) => {
  const value = key(name);
  if (places.has(value)) places.set(value, null); // A city name alone cannot disambiguate municipalities.
  else places.set(value, { department, lat, lon });
});
export function municipalityDistance(first, second) {
  const a = places.get(key(first)), b = places.get(key(second));
  if (!a || !b) return null;
  const radians = value => value * Math.PI / 180;
  const h = Math.sin(radians(b.lat - a.lat) / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(radians(b.lon - a.lon) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export function nearbyZones(professionals, city, { verified = false, minRating = 0, radius = 80 } = {}) {
  const groups = new Map();
  professionals.forEach(pro => {
    if (!pro.city || key(pro.city) === key(city) || (verified && !pro.verified) || Number(pro.rating || 0) < Number(minRating)) return;
    const distance = municipalityDistance(city, pro.city);
    if (distance === null || distance > radius) return;
    const name = key(pro.city);
    const zone = groups.get(name) || { city: pro.city, distance, count: 0 };
    zone.count++; groups.set(name, zone);
  });
  return [...groups.values()].sort((a, b) => a.distance - b.distance).slice(0, 5);
}
