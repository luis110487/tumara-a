import { useEffect, useId, useRef, useState } from 'react';
import { COLOMBIA } from '../data/colombia';
import { searchText } from '../lib/searchText';
const cities = COLOMBIA.flatMap(department => department.municipios.map(city => ({ city, department: department.departamento })));

export function CitySelect({ value = '', onChange, placeholder = 'Busca una ciudad o municipio', name }) {
  const id = useId(), input = useRef(null);
  const [text, setText] = useState(value), [open, setOpen] = useState(false), [active, setActive] = useState(-1);
  useEffect(() => { setText(value); setActive(-1); }, [value]);
  useEffect(() => { input.current?.setCustomValidity(text.trim() && text !== value ? 'Selecciona una ciudad o municipio de las sugerencias.' : ''); }, [text, value]);
  const needle = searchText(text);
  const matches = needle.length >= 2 ? cities.filter(item => searchText(item.city).includes(needle) || searchText(item.department).includes(needle)).sort((a, b) => Number(searchText(b.city).startsWith(needle)) - Number(searchText(a.city).startsWith(needle))).slice(0, 8) : [];
  const expanded = open && matches.length > 0;
  function choose(city) { setText(city); setOpen(false); setActive(-1); input.current?.setCustomValidity(''); onChange(city); }
  return <div className="city-autocomplete" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setActive(-1); } }}>
    {name && <input type="hidden" name={name} value={value} />}
    <input ref={input} type="text" value={text} placeholder={placeholder} aria-label="Buscar ciudad o municipio" autoComplete="off" maxLength={100} role="combobox" aria-autocomplete="list" aria-expanded={expanded} aria-controls={expanded ? id : undefined} aria-activedescendant={expanded && active >= 0 ? `${id}-${active}` : undefined} onFocus={() => setOpen(true)} onChange={event => { setText(event.target.value); setOpen(true); setActive(-1); }} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); setText(value); setOpen(false); }
      if (expanded && ['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setActive(index => event.key === 'ArrowDown' ? (index + 1) % matches.length : (index <= 0 ? matches.length - 1 : index - 1)); }
      if (event.key === 'Enter' && expanded) { event.preventDefault(); choose(matches[active < 0 ? 0 : active].city); }
    }} />
    {text && <button className="city-clear" type="button" aria-label="Limpiar ciudad" onClick={() => { choose(''); input.current?.focus(); }}>×</button>}
    {open && needle.length >= 2 && <ul id={id} role={matches.length ? 'listbox' : undefined} aria-label="Ciudades y municipios">{matches.length ? matches.map((item, index) => <li key={`${item.department}-${item.city}`} id={`${id}-${index}`} role="option" aria-selected={active === index} onMouseDown={event => event.preventDefault()} onClick={() => choose(item.city)}><strong>{item.city}</strong><small>{item.department}</small></li>) : <li role="status">No encontramos coincidencias. Prueba otro nombre.</li>}</ul>}
  </div>;
}
