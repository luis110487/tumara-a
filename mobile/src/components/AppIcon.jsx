export function AppIcon({ name, size = 23, filled = false }) {
  const paths = {
    share: <><path d="M12 15V2m-4 4 4-4 4 4M7 10H4v12h16V10h-3" /></>,
    calendar: <><rect x="3" y="5" width="18" height="17" rx="2" /><path d="M7 2v6M17 2v6M3 11h18M8 15h2M14 15h2M8 18h2" /></>,
    shield: <><path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6Z" /><path d="m8 12 3 3 5-6" /></>,
    plus: <path d="M12 4v16M4 12h16" />,
    filter: <><path d="M3 6h18M3 12h18M3 18h18M8 3v6M16 9v6M9 15v6" /></>,
    locate: <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /><path d="M12 1v4M12 19v4M1 12h4M19 12h4" /></>,
    tag: <><path d="M3 3h9l9 9-9 9-9-9Z" /><circle cx="8" cy="8" r="1" fill="white" stroke="white" /></>,
    clipboard: <><rect x="5" y="4" width="14" height="18" rx="2" /><rect x="9" y="2" width="6" height="4" rx="1" /><path d="M9 11h6M9 15h6M9 19h4" /></>,
    star: <path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" />,
    card: <><rect x="2" y="5" width="20" height="14" rx="3" /><path d="M2 10h20M6 15h3" /></>,
    settings: <><path d="m10 2-1 3-3 1-3-1-1 4 3 2v3l-2 3 3 3 3-2 3 1 2 3 4-1v-4l2-2 3-1-1-4-3-1-1-3Z" /><circle cx="12" cy="12" r="3" /></>,
    help: <><circle cx="12" cy="12" r="10" /><path d="M9 8a3 3 0 1 1 4 3c-1 1-1 2-1 3M12 18h.01" /></>,
    logout: <><path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5M14 7l5 5-5 5M8 12h13" /></>,
    dots: <><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5M5 8a8 8 0 0 1 13-3l2 3M4 16l2 3a8 8 0 0 0 13-3" /></>,
    send: <path d="m3 3 19 9-19 9 4-9ZM7 12h15" />,
    phone: <path d="M8 3H4a1 1 0 0 0-1 1c0 10 7 17 17 17a1 1 0 0 0 1-1v-4l-5-2-2 3a15 15 0 0 1-7-7l3-2Z" />,
    bookmark: <path d="M6 3h12v19l-6-4-6 4Z" />,
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
    heart: <path d="M20.5 5.5a5 5 0 0 0-7 0L12 7l-1.5-1.5a5 5 0 0 0-7 7L12 21l8.5-8.5a5 5 0 0 0 0-7Z" />,
    chat: <><path d="M20 15a3 3 0 0 1-3 3H9l-5 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3Z" /><path d="M8 8h8M8 12h5" /></>,
    user: <><circle cx="12" cy="7" r="4" /><path d="M4 22v-3a8 8 0 0 1 16 0v3" /></>,
    pin: <><path d="M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 0 1 14 0Z" /><circle cx="12" cy="10" r="2" /></>,
    search: <><circle cx="10.5" cy="10.5" r="7" /><path d="m16 16 5 5" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    down: <path d="m7 10 5 5 5-5" />,
    back: <path d="m14 5-7 7 7 7M7 12h14" />,
    snow: <><path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M4 10l4-1-1-4M20 14l-4 1 1 4M4 14l4 1-1 4M20 10l-4-1 1-4" /></>,
    bricks: <><path d="M2 4h20v16H2ZM2 9h20M2 15h20M9 4v5M16 9v6M8 15v5" /></>,
    door: <><rect x="5" y="2" width="14" height="20" rx="1" /><path d="m8 4 8 2v14l-8 2ZM12 13h1" /></>,
    key: <><circle cx="8" cy="8" r="5" /><circle cx="7" cy="7" r="1" /><path d="m12 12 9 9M15 15l3-3M18 18l3-3" /></>,
    bolt: <path d="m14 1-10 13h7l-1 9 10-14h-7Z" />,
    broom: <><path d="m19 2-7 12M9 11l7 4M8 12 3 20l10 2 3-7M7 20l4-6M10 21l3-6" /></>,
    car: <><path d="m4 9 2-6h12l2 6M3 9h18v9H3ZM5 18v3M19 18v3M6 13h2M16 13h2" /></>,
    roller: <><rect x="3" y="3" width="15" height="6" rx="2" /><path d="M18 6h3v7h-9v3M10 16h4v6h-4Z" /></>,
    water: <><path d="M3 11h18v6h-5v5h-5v-5H3ZM7 7h11M13 3v8" /></>,
    leaf: <><path d="M21 3C6 1 1 8 4 16c8 6 17-1 17-13ZM3 22 17 8" /></>,
    tools: <><path d="M14 6a6 6 0 0 0-7 8l-5 5 3 3 5-5a6 6 0 0 0 8-7l-4 4-4-4Z" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name] || paths.tools}</svg>;
}

export function categoryAppearance(name = '') {
  const value = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/aire|clima|refriger/.test(value)) return ['snow', '#0762e8', '#edf5ff'];
  if (/alban|constru/.test(value)) return ['bricks', '#ed543a', '#fff0eb'];
  if (/carpin|mueble/.test(value)) return ['door', '#985d22', '#faf1e5'];
  if (/cerraj/.test(value)) return ['key', '#f09a00', '#fff6e5'];
  if (/electri/.test(value)) return ['bolt', '#f3a000', '#fff8e8'];
  if (/limpi|aseo/.test(value)) return ['broom', '#03964c', '#eaf8ee'];
  if (/mecan|vehic|autom/.test(value)) return ['car', '#e6222c', '#fff0f1'];
  if (/pint/.test(value)) return ['roller', '#7140d5', '#f3edff'];
  if (/plom|fontan/.test(value)) return ['water', '#0781d7', '#eaf5fe'];
  if (/jardin/.test(value)) return ['leaf', '#138645', '#edf8ee'];
  return ['tools', '#164678', '#edf3fa'];
}
