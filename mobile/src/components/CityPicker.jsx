import { useState } from 'react';
import { COLOMBIA, municipiosDe } from '../data/colombia';

function departamentoDe(municipio) {
  const d = COLOMBIA.find(x => x.municipios.includes(municipio));
  return d ? d.departamento : '';
}

export function CityPicker({ value = '', onChange, name = 'city', required = false }) {
  const [departamento, setDepartamento] = useState(() => departamentoDe(value));
  const [municipio, setMunicipio] = useState(value);
  const municipios = municipiosDe(departamento);

  function handleDepartamento(e) {
    const dep = e.target.value;
    setDepartamento(dep);
    setMunicipio('');
    onChange?.('');
  }

  function handleMunicipio(e) {
    const m = e.target.value;
    setMunicipio(m);
    onChange?.(m);
  }

  return (
    <div className="two">
      <label>Departamento
        <select value={departamento} onChange={handleDepartamento}>
          <option value="">Selecciona…</option>
          {COLOMBIA.map(d => <option key={d.departamento} value={d.departamento}>{d.departamento}</option>)}
        </select>
      </label>
      <label>Municipio
        <select value={municipio} onChange={handleMunicipio} required={required} disabled={!departamento}>
          <option value="">{departamento ? 'Selecciona…' : 'Elige un departamento primero'}</option>
          {municipios.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </label>
      {name && <input type="hidden" name={name} value={municipio} />}
    </div>
  );
}
