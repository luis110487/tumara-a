const ICONS = [
  '🔧', '💡', '🎨', '🪚', '🧹', '❄️', '🧱', '🔑',
  '🚗', '💻', '🏠', '🛠️', '🚰', '🪑', '🧰', '🌳',
  '🔌', '🚪', '🧯', '📦', '🧴', '🚿', '🪛', '🧲',
];

export function IconPicker({ value, onChange }) {
  return (
    <div className="icon-picker">
      {ICONS.map(icon => (
        <button
          key={icon}
          type="button"
          className={`icon-picker-item ${value === icon ? 'selected' : ''}`}
          onClick={() => onChange(icon)}
          aria-label={`Usar icono ${icon}`}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
