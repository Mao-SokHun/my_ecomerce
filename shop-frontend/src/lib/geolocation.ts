export type ClientGeoCoords = { latitude: number; longitude: number };

const GEO_TIMEOUT_MS = 4500;

/**
 * Optional browser GPS (HTTPS + user permission). Returns null if denied, unsupported, or timeout.
 * Used only to enrich auth Telegram lines — not stored in DB.
 */
export function getOptionalBrowserGeolocation(): Promise<ClientGeoCoords | null> {
  if (typeof window === 'undefined' || !navigator.geolocation) return Promise.resolve(null);

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(null), GEO_TIMEOUT_MS);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(timer);
        const { latitude, longitude } = pos.coords;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          resolve(null);
          return;
        }
        resolve({ latitude, longitude });
      },
      () => {
        window.clearTimeout(timer);
        resolve(null);
      },
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: GEO_TIMEOUT_MS }
    );
  });
}
