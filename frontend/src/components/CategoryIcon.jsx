const PATHS = {
  wrench: 'M14.7 6.3a4 4 0 0 0-5.4 4.8L3 17.4V21h3.6l6.3-6.3a4 4 0 0 0 4.8-5.4l-2.5 2.5-2-2 2.5-2.5z',
  bolt: 'M13 2 4 14h6l-1 8 9-12h-6l1-8z',
  paint: 'M4 3h12v6a2 2 0 0 1-2 2h-1v3a3 3 0 1 1-6 0v-3H6a2 2 0 0 1-2-2V3zm5 11v2a1 1 0 0 0 2 0v-2H9z',
  saw: 'M3 12h13l3-3 2 1-2 4-2 1-3-3H3v0zM6 12v6M9 12v6M12 12v5',
  broom: 'M11 2 9 9l-6 9 3 2 6-8 6-3-4-4-4 4zM4 20l3-4',
  snowflake: 'M12 2v20M4.5 6l15 12M19.5 6l-15 12M6 4l1.5 3-3 1M18 4l-1.5 3 3 1M6 20l1.5-3-3-1M18 20l-1.5-3 3-1',
  bricks: 'M3 5h6v4H3zM11 5h6v4h-6zM19 5h2v4h-2zM1 9h2v4h-2zM5 9h6v4H5zM13 9h6v4h-6zM3 13h6v4H3zM11 13h6v4h-6zM19 13h2v4h-2z',
  key: 'M8 15a5 5 0 1 1 4.9-6H21l-2 2 2 2-2 2-2-2-2 2h-3.1A5 5 0 0 1 8 15zm0-3a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  car: 'M4 16v3a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h10v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-3M4 16l1.5-6A2 2 0 0 1 7.4 8.5h9.2A2 2 0 0 1 18.5 10L20 16M4 16h16M7 12h10M7.5 19a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  computer: 'M3 4h18v11H3zM9 20h6M12 15v5',
  home: 'M4 11 12 4l8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z',
  tools: 'M14.7 6.3a4 4 0 0 0-5.4 4.8L3 17.4V21h3.6l6.3-6.3a4 4 0 0 0 4.8-5.4l-2.5 2.5-2-2 2.5-2.5zM17 3l4 4-2 2-4-4z',
  faucet: 'M5 3v6a3 3 0 0 0 3 3h4M9 12v3M9 19v-4M20 8h-8M17 8v4a3 3 0 0 1-3 3',
  chair: 'M6 4h12v8H6zM6 12v8M18 12v8M6 20h2M16 20h2M9 4V2M15 4V2',
  toolbox: 'M3 9h18v10H3zM8 9V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3M3 13h18',
  tree: 'M12 2 7 10h3l-4 6h4v6h4v-6h4l-4-6h3z',
  plug: 'M9 2v6M15 2v6M7 8h10v4a5 5 0 0 1-10 0zM12 17v5',
  door: 'M6 2h9v20H6zM17 2h1v20h-1zM12 12a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
  extinguisher: 'M11 2h3v3h-3zM9 6h6l1 3H8zM8 9h7v13H8zM6 12h2M17 12h-2',
  box: 'M3 8 12 4l9 4-9 4-9-4zM3 8v9l9 4 9-4V8M12 12v9',
  spray: 'M6 3h4v3H6zM7 6v3M4 9h6l1 12H3zM11 8h4M13 6v4M15 12h3M14 15h4',
  shower: 'M6 3a4 4 0 0 1 8 0M4 8h16M6 12v1M10 12v1M14 12v1M18 12v1M6 16v1M10 16v1M14 16v1M18 16v1M6 20v1M10 20v1M14 20v1M18 20v1',
  screwdriver: 'M14 3l7 7-2 2-7-7zM12 8l2 2-8 8-3 1 1-3z',
  magnet: 'M6 4h4v8a2 2 0 0 0 4 0V4h4v8a6 6 0 0 1-12 0z M6 4v3H4V4z M18 4v3h-2V4z',
  lightbulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3 11.2c.6.4 1 1.1 1 1.8h4c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z',
  more: 'M4 12h.01M12 12h.01M20 12h.01',
};

const DEFAULT_PATH = 'M4 4h16v16H4zM8 12h8';

export const ICON_KEYS = Object.keys(PATHS).filter(k => k !== 'more');

export function CategoryIcon({ name, size = 24 }) {
  const d = PATHS[name] || DEFAULT_PATH;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
