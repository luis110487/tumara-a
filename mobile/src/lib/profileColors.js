export const PROFILE_COLORS = [
  { value: 'blue', label: 'Azul', start: '#0879ef', end: '#0756ca' },
  { value: 'green', label: 'Verde', start: '#08b982', end: '#079f70' },
  { value: 'orange', label: 'Naranja', start: '#ff9714', end: '#ee6b06' },
  { value: 'purple', label: 'Morado', start: '#9149ef', end: '#6528d5' },
];

export function profileColor(value, id = '') {
  if (PROFILE_COLORS.some(color => color.value === value)) return value;
  const index = Array.from(String(id)).reduce((total, character) => total + character.charCodeAt(0), 0) % PROFILE_COLORS.length;
  return PROFILE_COLORS[index].value;
}

const STORAGE_KEY = 'tumarana-profile-colors';

function storedColors() {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}

export function storedProfileColor(id) {
  const value = storedColors()[String(id)];
  return PROFILE_COLORS.some(color => color.value === value) ? value : '';
}

export function rememberProfileColor(id, value) {
  if (typeof window === 'undefined' || !id || !PROFILE_COLORS.some(color => color.value === value)) return;
  try {
    const colors = storedColors();
    colors[String(id)] = value;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  } catch { /* El color sigue viajando en el estado de navegación. */ }
}
