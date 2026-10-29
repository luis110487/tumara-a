import { useId } from 'react';

export function categoryVisual(name = '') {
  const text = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const options = [
    [/aire|clima|refriger/, 'air', '#edf6fb', 'Instalación y mantenimiento'],
    [/alban|constru/, 'bricks', '#fff1ed', 'Construcción y remodelación'],
    [/carpin|mueble/, 'door', '#fff5e9', 'Muebles y reparaciones'],
    [/cerraj/, 'key', '#fff8e9', 'Aperturas y seguridad'],
    [/electri/, 'bolt', '#fff7e9', 'Instalaciones y reparaciones'],
    [/plom|fontan/, 'pipe', '#edf6ff', 'Plomería y fugas'],
    [/pint/, 'paint', '#eef7ff', 'Interiores y exteriores'],
    [/jardin/, 'leaf', '#edfaf0', 'Mantenimiento de zonas verdes'],
    [/limpi|aseo/, 'spray', '#eff8fc', 'Hogar y oficinas'],
    [/mudan|transpor/, 'truck', '#edf6ff', 'Transporte y carga'],
    [/electrodom|lavador/, 'washer', '#f2f6fa', 'Servicio técnico'],
    [/piso/, 'floor', '#fff5ed', 'Instalación y reparación'],
    [/herrer|soldad/, 'oven', '#eff5f8', 'Estructuras metálicas'],
    [/vidri|ventan/, 'window', '#edf7f6', 'Ventanas y puertas'],
    [/inform|tecnolog|comput|soporte/, 'monitor', '#edf6fc', 'Soporte y equipos'],
  ];
  const match = options.find(([pattern]) => pattern.test(text));
  return match ? { kind: match[1], background: match[2], description: match[3] } : { kind: 'other', background: '#fff4e8', description: 'Más servicios' };
}

/** Local vector artwork keeps category imagery sharp and available offline. */
export function CategoryArtwork({ name }) {
  const id = useId().replace(/:/g, '');
  const { kind } = categoryVisual(name);
  const metal = `url(#metal${id})`, blue = `url(#blue${id})`, gold = `url(#gold${id})`;
  const art = {
    air: <><rect x="4" y="15" width="56" height="29" rx="5" fill="#aab5bb" /><rect x="4" y="12" width="56" height="28" rx="5" fill={metal} /><path d="M9 32h46v6H9Z" fill="#71838d" /><path d="M10 34h44M10 36h44" stroke="#d5e0e5" /><circle cx="52" cy="19" r="1.5" fill="#40b3c2" /></>,
    bricks: <><g stroke="#ffc1a2" strokeWidth="1.2" fill="#ed603a"><rect x="4" y="33" width="18" height="11" rx="1" /><rect x="23" y="33" width="18" height="11" rx="1" /><rect x="42" y="33" width="18" height="11" rx="1" /><rect x="11" y="21" width="20" height="11" rx="1" /><rect x="32" y="21" width="20" height="11" rx="1" /><rect x="22" y="9" width="24" height="11" rx="1" /></g><path d="m4 44 4 4h52v-4M46 9l4 4v7h-4" fill="#bf4427" /></>,
    door: <><path d="M15 5h35v49H15Z" fill="#9b582c" /><path d="M18 8h29v46H18Z" fill="#d48c4c" /><path d="m22 10 22 3v41l-22 3Z" fill="#b76f37" /><path d="m26 17 13 1v12H26ZM26 35h13v13H26Z" fill="none" stroke="#e4a365" strokeWidth="2" /><circle cx="39" cy="33" r="2" fill="#ffe2a2" /></>,
    key: <><g transform="rotate(-38 32 32)"><circle cx="32" cy="18" r="13" fill={gold} /><circle cx="32" cy="18" r="6" fill="#fff8e9" /><path d="M28 29h8v27h-8Z" fill={gold} /><path d="M34 40h10v6H34ZM34 51h9v5h-9Z" fill="#e78a00" /></g></>,
    bolt: <><path d="m37 3-24 32h17l-4 26 27-37H36l5-21Z" fill="#d87700" /><path d="M31 3 10 33h17l-4 23 25-34H32l5-19Z" fill={gold} /><path d="m31 8-14 21h9" fill="none" stroke="#ffe899" strokeWidth="2" /></>,
    pipe: <><path d="M7 26h26V14h14v18a10 10 0 0 1-10 10H7Z" fill={metal} stroke="#718eaa" strokeWidth="2" /><path d="M36 13h15M37 8h12M43 5v13" stroke="#5e83a2" strokeWidth="5" strokeLinecap="round" /><rect x="5" y="23" width="10" height="23" rx="3" fill="#a0b6c8" /><path d="M47 44c-10 12-5 15 0 15s10-3 0-15" fill="#39b5f5" /></>,
    paint: <><rect x="8" y="8" width="38" height="16" rx="4" fill={blue} /><path d="M12 10h31v5H12Z" fill="#5dc0ff" /><path d="M46 16h8v17H31v10" fill="none" stroke="#8294a1" strokeWidth="5" strokeLinejoin="round" /><rect x="26" y="40" width="11" height="19" rx="4" fill={gold} /></>,
    leaf: <><path d="M31 54C8 48 2 26 10 12c19 0 30 20 21 42" fill="#1baf65" /><path d="M32 48C27 22 40 5 59 5c1 23-9 38-27 43" fill="#0b9f58" /><path d="M31 59V37M32 45 49 16M31 48 14 22" fill="none" stroke="#087f46" strokeWidth="3" strokeLinecap="round" /></>,
    spray: <><path d="M22 24h18l9 31H13Z" fill={blue} /><rect x="22" y="15" width="18" height="12" rx="3" fill="#1689d8" /><path d="M19 8h29v7H29v5h-7v-7h-3Z" fill="#036bb9" /><path d="m41 15-4 12" stroke="#09629f" strokeWidth="4" /><path d="m23 32-5 16" stroke="#a6e1ff" strokeWidth="4" strokeLinecap="round" /></>,
    truck: <><rect x="3" y="15" width="34" height="29" rx="3" fill={blue} /><path d="M37 23h13l11 14v7H37Z" fill={gold} /><path d="M42 26h7l7 10H42Z" fill="#d8f4ff" /><path d="M3 42h58v6H3Z" fill="#174e78" /><circle cx="16" cy="48" r="7" fill="#193b56" /><circle cx="48" cy="48" r="7" fill="#193b56" /><circle cx="16" cy="48" r="3" fill="#d8e4e9" /><circle cx="48" cy="48" r="3" fill="#d8e4e9" /></>,
    washer: <><rect x="11" y="4" width="43" height="55" rx="4" fill={metal} stroke="#9bafb9" /><path d="M12 16h41" stroke="#a1b5c0" /><rect x="16" y="8" width="15" height="5" rx="1" fill="#7196aa" /><circle cx="46" cy="10" r="3" fill="#5a6c78" /><circle cx="33" cy="36" r="16" fill="#8eacbf" /><circle cx="33" cy="36" r="12" fill="#284c68" /><path d="M24 39c6-12 11 10 19-6v8c-6 10-16 8-19-2" fill="#58a7d4" /><path d="M25 27a12 12 0 0 1 12-3" fill="none" stroke="#bce7fa" strokeWidth="2" /></>,
    floor: <><path d="m4 44 17-30 38 10-15 31Z" fill="#bf9268" /><path d="m6 39 16-29 38 10-16 30Z" fill="#e1b58e" /><path d="m20 14 33 10M16 23l33 10M12 32l33 10M35 14 19 43M49 18 33 47" stroke="#a77f59" strokeWidth="1.5" /><path d="m22 11-2 7M37 16l-2 8" stroke="#f5d8b9" /></>,
    oven: <><rect x="9" y="7" width="46" height="51" rx="3" fill={metal} stroke="#7693a5" /><rect x="12" y="10" width="40" height="9" fill="#657a86" /><g fill="#d2dde2"><circle cx="18" cy="14" r="2" /><circle cx="27" cy="14" r="2" /><circle cx="36" cy="14" r="2" /><circle cx="45" cy="14" r="2" /></g><rect x="15" y="24" width="34" height="27" rx="3" fill="#273c4c" /><path d="M20 29h24M20 44h24" stroke="#7f9db0" strokeWidth="2" /></>,
    window: <><path d="M13 6h38v52H13Z" fill="#547776" /><path d="M17 10h30v44H17Z" fill="#cce8e4" /><path d="M32 10v44" stroke="#658a85" strokeWidth="3" /><path d="m17 10 12 5v40l-12-2Z" fill="#96c6bc" stroke="#446e65" strokeWidth="2" /><path d="m35 19 8-6M35 30l9-7" stroke="#f2fffc" strokeWidth="2" /></>,
    monitor: <><rect x="6" y="7" width="50" height="34" rx="4" fill="#224c6c" /><rect x="10" y="11" width="42" height="26" rx="1" fill={blue} /><path d="m14 14 20 1-20 14Z" fill="#78c8ee" opacity=".5" /><path d="M27 41h9v10h10v5H18v-5h9Z" fill="#57758e" /><path d="M39 48h20v10H39Z" fill="#6188a4" /></>,
    other: <><g fill={gold}><circle cx="21" cy="19" r="10" /><circle cx="45" cy="19" r="10" /><circle cx="21" cy="44" r="10" /><circle cx="45" cy="44" r="10" /></g><g stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M17 19h8M21 15v8M41 19h8M17 44l3 3 5-6M42 44h6" /></g></>,
  };
  return <svg viewBox="0 0 64 64" width="58" height="58" aria-hidden="true"><defs><linearGradient id={`metal${id}`} x2=".9" y2="1"><stop stopColor="#f5fafc" /><stop offset=".5" stopColor="#d2dfe5" /><stop offset="1" stopColor="#8ea5b2" /></linearGradient><linearGradient id={`blue${id}`} x2=".8" y2="1"><stop stopColor="#52c8ff" /><stop offset=".5" stopColor="#1597ed" /><stop offset="1" stopColor="#0967ba" /></linearGradient><linearGradient id={`gold${id}`} x2=".8" y2="1"><stop stopColor="#ffd16a" /><stop offset=".5" stopColor="#ffab13" /><stop offset="1" stopColor="#f27e00" /></linearGradient></defs><ellipse cx="32" cy="58" rx="24" ry="3" fill="#0c3556" opacity=".07" />{art[kind]}</svg>;
}
