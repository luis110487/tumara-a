import { useEffect, useRef, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { cityFromGps, gpsFeedback } from './gpsCity';

const DeviceLocation = registerPlugin('DeviceLocation');
let attemptedThisLaunch = false;

export function useDeviceCity(onCity) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [denied, setDenied] = useState(false);
  const callback = useRef(onCity);
  callback.current = onCity;
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const manualVersion = useRef(0);

  async function request() {
    if (inFlight.current) return;
    if (!Capacitor.isNativePlatform()) { setNotice('Elige tu ciudad en el selector de ubicación.'); return; }
    inFlight.current = true;
    const version = manualVersion.current;
    setBusy(true); setDenied(false); setNotice('Buscando tu ciudad…');
    try {
      const data = await DeviceLocation.getCurrentCity();
      if (!mounted.current) return;
      if (version !== manualVersion.current) { setNotice('Se conservó la ciudad que elegiste.'); return; }
      const city = cityFromGps(data);
      if (!city) throw Object.assign(new Error('Unknown city'), { code: 'NO_CITY' });
      callback.current(city);
      setNotice(`Ciudad detectada: ${city}.`);
    } catch (error) {
      if (mounted.current) { setDenied(error?.code === 'LOCATION_DENIED'); setNotice(gpsFeedback(error?.code)); }
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  useEffect(() => {
    mounted.current = true;
    function ready() {
      if (!Capacitor.isNativePlatform() || attemptedThisLaunch || manualVersion.current > 0) return;
      attemptedThisLaunch = true;
      request();
    }
    window.addEventListener('tm:app-visible', ready);
    if (window.__tmAppVisible) ready();
    return () => { mounted.current = false; window.removeEventListener('tm:app-visible', ready); };
  }, []);

  return { busy, notice, denied, request,
    markManual: () => { manualVersion.current++; setNotice(''); setDenied(false); },
    openSettings: async () => {
      try { await DeviceLocation.openPermissionSettings(); }
      catch { if (mounted.current) setNotice('Abre los permisos de ubicación desde los ajustes del móvil.'); }
    },
  };
}
