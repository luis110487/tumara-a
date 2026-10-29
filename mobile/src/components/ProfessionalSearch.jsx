import { useEffect, useId, useState } from 'react';
import { apiFetchPublic } from '../lib/apiClient';
import { searchText } from '../lib/searchText';

export function ProfessionalSearch({ value, onChange, city, categories = [], professionals = [], maxLength = 100, placeholder = "Nombre u ocupación del marañero" }) {
  const id = useId();
  const [matches, setMatches] = useState([]), [focused, setFocused] = useState(false), [dismissed, setDismissed] = useState(false), [active, setActive] = useState(-1);
  const needle = searchText(value);
  useEffect(() => {
    let alive = true;
    setMatches([]); setActive(-1);
    if (needle.length < 2) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ q: value.trim(), limit: '6' });
      if (city) params.set('city', city);
      apiFetchPublic(`/api/professionals?${params}`).then(rows => { if (alive) setMatches(Array.isArray(rows) ? rows : []); }).catch(() => {});
    }, 250);
    return () => { alive = false; clearTimeout(timer); };
  }, [value, city]);
  const options = [];
  const add = (text, detail) => { if (text && searchText(text).includes(needle) && !options.some(option => searchText(option.text) === searchText(text))) options.push({ text, detail }); };
  if (needle.length >= 2) {
    categories.forEach(category => add(category.name, 'Ocupación'));
    [...matches, ...professionals.filter(pro => !city || searchText(pro.city) === searchText(city))].forEach(pro => { add(pro.display_name, pro.category || 'Marañero'); add(pro.category, 'Ocupación'); });
  }
  const visible = options.slice(0, 6), open = focused && !dismissed && visible.length > 0;
  const choose = text => { onChange(text); setDismissed(true); setActive(-1); };
  return <div className="professional-search" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) { setFocused(false); setActive(-1); } }}>
    <input name="q" value={value} onChange={event => { onChange(event.target.value); if (document.activeElement === event.target) setFocused(true); setDismissed(false); setActive(-1); }} onFocus={() => setFocused(true)} placeholder={placeholder} maxLength={maxLength} enterKeyHint="search" autoComplete="off" role="combobox" aria-label="Nombre u ocupación del marañero" aria-autocomplete="list" aria-expanded={open} aria-controls={open ? id : undefined} aria-activedescendant={open && active >= 0 ? `${id}-${active}` : undefined} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); setDismissed(true); }
      if (open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) { event.preventDefault(); setActive(index => event.key === 'ArrowDown' ? (index + 1) % visible.length : (index <= 0 ? visible.length - 1 : index - 1)); }
      if (open && event.key === 'Enter' && active >= 0) { event.preventDefault(); choose(visible[active].text); }
    }} />
    {open && <ul id={id} role="listbox" aria-label="Sugerencias de búsqueda">{visible.map((option, index) => <li key={option.text} id={`${id}-${index}`} role="option" aria-selected={index === active} onMouseDown={event => event.preventDefault()} onClick={() => choose(option.text)}><span>{option.text}</span><small>{option.detail}</small></li>)}</ul>}
  </div>;
}
