import { useState } from "react";
import { Bike, Navigation, RefreshCw, Wrench } from "lucide-react";
import MapView from "../components/MapView";
import {
  Button,
  DemoNote,
  Feedback,
  PageTitle,
  Status,
} from "../components/ui";
import { useLocation } from "../components/useLocation";
import { useAction, useStore } from "../store";
import { distanceKm } from "../rules";
import { date } from "../domain";
export default function Bikes() {
  const { data, repo } = useStore();
  const action = useAction();
  const geo = useLocation();
  const [selected, setSelected] = useState("");
  const [description, setDescription] = useState("");
  if (!data) return null;
  const stations = [...data.stations].sort((a, b) =>
    geo.location
      ? distanceKm(geo.location, a) - distanceKm(geo.location, b)
      : a.name.localeCompare(b.name),
  );
  const current = data.stations.find((s) => s.id === selected);
  return (
    <>
      <PageTitle
        title="Bicicletas públicas"
        description="Encontrá una estación y consultá sus bicicletas y anclajes."
      >
        <Button secondary disabled={geo.busy} onClick={geo.locate}>
          <Navigation size={16} /> {geo.busy ? "Buscando…" : "Cerca de mí"}
        </Button>
      </PageTitle>
      <DemoNote />
      <Feedback message={geo.error} failed />
      <Feedback {...action} />
      <MapView
        points={stations.map((s) => ({
          ...s,
          label: s.name,
          detail: `${s.bikes} bicicletas y ${s.docks} anclajes libres`,
          value: String(s.bikes),
        }))}
        selected={selected}
        onSelect={setSelected}
        location={geo.location}
      />
      <div className="section-heading">
        <h2>Estaciones {geo.location ? "por cercanía" : "disponibles"}</h2>
        {repo.mode === "demo" && (
          <button
            className="text-button"
            disabled={action.busy}
            onClick={() =>
              void action.run(
                () => repo.simulate("bikes"),
                "Disponibilidad demo actualizada.",
              )
            }
          >
            <RefreshCw size={16} /> Simular disponibilidad
          </button>
        )}
      </div>
      <div className="station-grid">
        {stations.map((s) => (
          <button
            key={s.id}
            className={`station-card ${selected === s.id ? "selected" : ""}`}
            onClick={() => setSelected(s.id)}
          >
            <div className="row-between">
              <h3>{s.name}</h3>
              <Bike size={22} />
            </div>
            <p>
              {s.address}
              {geo.location &&
                ` · ${distanceKm(geo.location, s).toFixed(1)} km`}
            </p>
            <div className="station-counts">
              <strong>
                {s.bikes}
                <small>bicicletas</small>
              </strong>
              <strong>
                {s.docks}
                <small>anclajes libres</small>
              </strong>
              <Status tone={s.bikes ? "good" : "warning"}>
                {s.bikes ? "Disponible" : "Sin bicicletas"}
              </Status>
            </div>
            <small>
              Actualizado {new Date(s.updated_at).toLocaleTimeString("es-AR")}
            </small>
          </button>
        ))}
      </div>
      {current && (
        <section className="panel">
          <h2>
            <Wrench size={21} /> Reportar un problema en {current.name}
          </h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await action.run(
                  () => repo.reportBike(current.id, description),
                  "Reporte registrado. Podés verlo debajo.",
                )
              )
                setDescription("");
            }}
          >
            <label>
              ¿Qué ocurrió?
              <textarea
                required
                minLength={10}
                maxLength={2000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describí la bicicleta, el anclaje o el problema…"
              />
            </label>
            <Button type="submit" disabled={action.busy}>
              Enviar reporte
            </Button>
          </form>
        </section>
      )}
      <section className="panel">
        <h2>Mis reportes</h2>
        {data.bike_reports.length ? (
          data.bike_reports.map((r) => (
            <div className="list-row" key={r.id}>
              <div>
                <strong>
                  {data.stations.find((s) => s.id === r.station_id)?.name}
                </strong>
                <p>{r.description}</p>
              </div>
              <span>{date(r.created_at)}</span>
            </div>
          ))
        ) : (
          <p>Seleccioná una estación para informar un problema.</p>
        )}
      </section>
    </>
  );
}
