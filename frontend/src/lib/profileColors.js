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
