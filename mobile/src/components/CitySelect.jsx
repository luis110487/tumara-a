import { COLOMBIA } from '../data/colombia';

export function CitySelect({ value = '', onChange, placeholder = 'Selecciona una ciudad', name }) {
  return (
    <select name={name} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {COLOMBIA.map(d => (
        <optgroup key={d.departamento} label={d.departamento}>
          {d.municipios.map(m => <option key={m} value={m}>{m}</option>)}
        </optgroup>
      ))}
    </select>
  );
}
