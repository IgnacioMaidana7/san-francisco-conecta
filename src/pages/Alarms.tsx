import { useState } from "react";
import { ShieldCheck, MapPin } from "lucide-react";
import MapView from "../components/MapView";
import { useLocation } from "../components/useLocation";
import {
  Button,
  DemoNote,
  Feedback,
  PageTitle,
  Status,
} from "../components/ui";
import { useAction, useStore } from "../store";
import { distanceKm } from "../rules";
export default function Alarms() {
  const { data, repo } = useStore();
  const action = useAction();
  const geo = useLocation();
  const [selected, setSelected] = useState("");
  if (!data) return null;
  const zones = [...new Set(data.alarms.map((a) => a.zone))];
  async function toggleZone(zone: string) {
    if (!data) return;
    const current = data.preferences.zones;
    await action.run(
      () =>
        repo.savePreferences({
          ...data.preferences,
          zones: current.includes(zone)
            ? current.filter((z) => z !== zone)
            : [...current, zone],
        }),
      "Suscripción actualizada.",
    );
  }
  return (
    <>
      <PageTitle
        title="Alarmas comunitarias"
        description="Consultá el estado de las alarmas y conectate con tu barrio."
      />
      <DemoNote>
        Simulación académica. Esta aplicación no activa sirenas ni atiende
        emergencias.
      </DemoNote>
      <Feedback {...action} />
      <Feedback message={geo.error} failed />
      <MapView
        points={data.alarms.map((a) => ({
          ...a,
          label: a.name,
          detail: a.active ? "Activada · Simulación" : "Desactivada",
          value: "!",
          active: a.active,
        }))}
        selected={selected}
        onSelect={setSelected}
        location={data.preferences.location}
      />
      <div className="two-columns">
        <section className="panel">
          <h2>
            <ShieldCheck size={22} /> Estado de las alarmas
          </h2>
          {data.alarms.map((a) => (
            <article className="alarm-row" key={a.id}>
              <button
                className="alarm-select"
                onClick={() => setSelected(a.id)}
              >
                <strong>{a.name}</strong>
                <span>
                  {a.zone}
                  {data.preferences.location &&
                    ` · ${distanceKm(data.preferences.location, a).toFixed(1)} km`}
                </span>
              </button>
              <Status tone={a.active ? "danger" : "good"}>
                {a.active ? "Activada" : "Desactivada"}
              </Status>
              {repo.mode === "demo" && (
                <button
                  className="text-button"
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(
                      () => repo.simulate("alarm", a.id),
                      "Estado demo actualizado. Si coincide con tus preferencias, recibirás un aviso en el historial.",
                    )
                  }
                >
                  Simular {a.active ? "desactivación" : "activación"}
                </button>
              )}
            </article>
          ))}
        </section>
        <section className="panel">
          <h2>Mis zonas de interés</h2>
          <p>Recibí avisos de las zonas a las que te suscribís.</p>
          {zones.map((zone) => (
            <label className="checkbox-row" key={zone}>
              <input
                type="checkbox"
                checked={data.preferences.zones.includes(zone)}
                disabled={action.busy}
                onChange={() => void toggleZone(zone)}
              />{" "}
              {zone}
            </label>
          ))}
          <hr />
          <h3>Alertas cercanas</h3>
          <p>
            Opcional: guardá una ubicación aproximada y recibí alertas dentro de{" "}
            {data.preferences.nearby_km} km, aunque no te hayas suscripto a esa
            zona.
          </p>
          <Button secondary disabled={geo.busy} onClick={geo.locate}>
            <MapPin size={16} /> Obtener ubicación
          </Button>
          {geo.location && (
            <Button
              disabled={action.busy}
              onClick={() =>
                void action.run(
                  () =>
                    repo.savePreferences({
                      ...data.preferences,
                      location: geo.location,
                    }),
                  "Ubicación guardada para alertas cercanas.",
                )
              }
            >
              Usar esta ubicación
            </Button>
          )}
          {data.preferences.location && (
            <button
              className="text-button"
              disabled={action.busy}
              onClick={() =>
                void action.run(
                  () =>
                    repo.savePreferences({
                      ...data.preferences,
                      location: null,
                    }),
                  "Ubicación eliminada.",
                )
              }
            >
              Eliminar ubicación guardada
            </button>
          )}
          <p className="muted">
            Las categorías y frecuencia se ajustan en Notificaciones.
          </p>
        </section>
      </div>
    </>
  );
}
