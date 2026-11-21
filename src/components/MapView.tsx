import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { center, type Point } from "../domain";

export type MapPoint = Point & {
  id: string;
  label: string;
  detail: string;
  value?: string;
  active?: boolean;
  radius?: number;
};
export default function MapView({
  points,
  selected,
  onSelect,
  location,
}: {
  points: MapPoint[];
  selected?: string;
  onSelect?: (id: string) => void;
  location?: Point | null;
}) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  useEffect(() => {
    if (!host.current) return;
    map.current = L.map(host.current, { scrollWheelZoom: false }).setView(
      [center.lat, center.lng],
      14,
    );
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    const observer = new ResizeObserver(() => map.current?.invalidateSize());
    observer.observe(host.current);
    return () => {
      observer.disconnect();
      map.current?.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (!layer.current || !map.current) return;
    layer.current.clearLayers();
    const cleanups: Array<() => void> = [];
    for (const point of points) {
      const label = document.createElement("span");
      label.textContent = `${point.label}. ${point.detail}`;
      const markerText = document.createElement("span");
      markerText.className = "pin-text";
      markerText.textContent = point.value ?? "";
      const icon = L.divIcon({
        className: `map-pin ${point.active ? "pin-active" : ""} ${selected === point.id ? "pin-selected" : ""}`,
        html: markerText,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });
      const marker = L.marker([point.lat, point.lng], {
        icon,
        title: point.label,
        alt: point.label,
      })
        .bindPopup(label)
        .addTo(layer.current);
      const select = () => onSelect?.(point.id);
      marker.on("click", select);
      cleanups.push(() => marker.off("click", select));
      if (point.radius)
        L.circle([point.lat, point.lng], {
          radius: point.radius,
          color: "#1c6d58",
          weight: 2,
          fillOpacity: 0.12,
        }).addTo(layer.current);
    }
    if (location) {
      L.circleMarker([location.lat, location.lng], {
        radius: 8,
        color: "white",
        fillColor: "#1564cf",
        fillOpacity: 1,
        weight: 3,
      })
        .bindPopup("Tu ubicación aproximada")
        .addTo(layer.current);
      map.current.panTo([location.lat, location.lng]);
    }
    return () => {
      cleanups.forEach((cleanup) => cleanup());
      layer.current?.clearLayers();
    };
  }, [points, selected, onSelect, location]);
  return (
    <div className="map-wrap">
      <div
        ref={host}
        className="city-map"
        aria-label="Mapa interactivo de San Francisco"
      />
      <span className="map-caption">
        Ubicaciones de demostración · San Francisco, Córdoba
      </span>
    </div>
  );
}
