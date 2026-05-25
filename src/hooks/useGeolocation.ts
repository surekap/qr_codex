import { useCallback, useRef } from 'react';

interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
}

export function useGeolocation() {
  const pendingRef = useRef<Map<string, (pos: GeoPosition | null) => void>>(new Map());

  const requestPosition = useCallback((id: string): Promise<GeoPosition | null> => {
    return new Promise(resolve => {
      if (!('geolocation' in navigator)) { resolve(null); return; }
      pendingRef.current.set(id, resolve);
      navigator.geolocation.getCurrentPosition(
        pos => {
          const cb = pendingRef.current.get(id);
          pendingRef.current.delete(id);
          cb?.({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        },
        () => {
          const cb = pendingRef.current.get(id);
          pendingRef.current.delete(id);
          cb?.(null);
        },
        { timeout: 5000, maximumAge: 30000 }
      );
    });
  }, []);

  return { requestPosition };
}
