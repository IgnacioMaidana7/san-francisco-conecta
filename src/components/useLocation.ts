import { useState } from "react";
import type { Point } from "../domain";
export function useLocation() {
  const [location, setLocation] = useState<Point | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function locate() {
    setError("");
    if (!navigator.geolocation) {
      setError(
        "Este navegador no ofrece ubicación. Podés elegir una estación en la lista.",
      );
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocation({ lat: p.coords.latitude, lng: p.coords.longitude });
        setBusy(false);
      },
      () => {
        setError(
          "No pudimos acceder a tu ubicación. Habilitá el permiso o elegí en el mapa.",
        );
        setBusy(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }
  return { location, error, busy, locate };
}
