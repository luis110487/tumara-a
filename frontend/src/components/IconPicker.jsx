import { CategoryIcon, ICON_KEYS } from './CategoryIcon';

export function IconPicker({ value, onChange }) {
  return (
    <div className="icon-picker">
      {ICON_KEYS.map(icon => (
        <button
          key={icon}
          type="button"
          className={`icon-picker-item ${value === icon ? 'selected' : ''}`}
          onClick={() => onChange(icon)}
          aria-label={`Usar icono ${icon}`}
        >
          <CategoryIcon name={icon} size={18} />
        </button>
      ))}
    </div>
  );
}
