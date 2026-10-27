import { COLOMBIA } from '../data/colombia';

export function readSelectedCity() {
  try {
    const city = localStorage.getItem('tm.home-city') || '';
    return COLOMBIA.some(d => d.municipios.includes(city)) ? city : '';
  } catch { return ''; }
}
