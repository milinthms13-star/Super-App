import { useEffect, useRef } from "react";

const getPosition = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: Math.round(position.coords.accuracy || 0),
        mapsUrl: `https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}`,
      }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
    );
  });

export const useLiveLocationRefresh = ({ incidentId, active, apiBaseUrl = "/api/sos", authToken, intervalMs = 30000 }) => {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!active || !incidentId) return undefined;

    const pushLocation = async () => {
      const location = await getPosition();
      if (!location) return;
      await fetch(`${apiBaseUrl}/incident/${incidentId}/location`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(location),
      }).catch(() => {});
    };

    pushLocation();
    timerRef.current = setInterval(pushLocation, intervalMs);
    return () => clearInterval(timerRef.current);
  }, [active, incidentId, apiBaseUrl, authToken, intervalMs]);
};
