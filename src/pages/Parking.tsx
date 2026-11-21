import { useEffect, useState } from "react";
import { CircleParking, Clock } from "lucide-react";
import MapView from "../components/MapView";
import {
  Button,
  DemoNote,
  Feedback,
  PageTitle,
  PaymentDialog,
  Status,
} from "../components/ui";
import { date, money } from "../domain";
import { parkingPrice, remainingTime } from "../rules";
import { useAction, useStore } from "../store";
export default function Parking() {
  const { data, repo } = useStore();
  const action = useAction();
  const [zoneId, setZone] = useState("");
  const [plate, setPlate] = useState("");
  const [minutes, setMinutes] = useState(60);
  const [confirm, setConfirm] = useState<"start" | "extend" | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!data) return null;
  const zone = data.zones.find((z) => z.id === zoneId) ?? data.zones[0];
  const active = data.parking.find(
    (p) => p.status === "active" && new Date(p.ends_at).getTime() > now,
  );
  const activeZone = data.zones.find((z) => z.id === active?.zone_id);
  const price = zone
    ? parkingPrice(
        confirm === "extend" && activeZone ? activeZone : zone,
        minutes,
      )
    : 0;
  return (
    <>
      <PageTitle
        title="Estacionamiento medido"
        description="Elegí una zona y administrá tu tiempo desde el celular."
      />
      <DemoNote>
        Zonas, horarios y tarifas ilustrativos. Un pago simulado no habilita
        estacionamiento real ni evita multas.
      </DemoNote>
      <Feedback {...action} />
      <MapView
        points={data.zones.map((z) => ({
          ...z,
          label: z.name,
          detail: `${money(z.hourly_rate)}/hora · ${z.hours}`,
          value: "P",
        }))}
        selected={zone?.id}
        onSelect={setZone}
      />
      <div className="two-columns">
        <section className="panel">
          <h2>
            <CircleParking size={23} />{" "}
            {active ? "Tu estacionamiento" : "Iniciar estacionamiento"}
          </h2>
          {active ? (
            <>
              <Status tone="good">Sesión demo activa · {active.plate}</Status>
              <div
                className="parking-clock"
                aria-live="off"
                aria-label="Tiempo restante"
              >
                {remainingTime(active.ends_at, now)}
              </div>
              <p>
                {activeZone?.name} · Finaliza a las{" "}
                {new Date(active.ends_at).toLocaleTimeString("es-AR")}
              </p>
              <p>
                Total simulado: <strong>{money(active.amount)}</strong>
              </p>
              <label>
                Minutos para extender
                <select
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                >
                  {[15, 30, 60, 120].map((n) => (
                    <option key={n} value={n}>
                      {n} minutos
                    </option>
                  ))}
                </select>
              </label>
              <div className="actions">
                <Button
                  disabled={action.busy}
                  onClick={() => setConfirm("extend")}
                >
                  Extender tiempo
                </Button>
                <Button
                  secondary
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(
                      () => repo.finishParking(active.id),
                      "Estacionamiento finalizado. No se realizan devoluciones en la demo.",
                    )
                  }
                >
                  Finalizar
                </Button>
              </div>
              <p className="muted">
                Aviso 5 minutos antes del vencimiento con la aplicación abierta.
                Con push configurado, el servidor puede avisar con la app
                cerrada.
              </p>
            </>
          ) : zone ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setConfirm("start");
              }}
            >
              <label>
                Zona
                <select
                  value={zone.id}
                  onChange={(e) => setZone(e.target.value)}
                >
                  {data.zones.map((z) => (
                    <option value={z.id} key={z.id}>
                      {z.name} · {money(z.hourly_rate)}/hora
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Patente
                <input
                  required
                  maxLength={9}
                  placeholder="AB123CD"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  autoCapitalize="characters"
                />
              </label>
              <label>
                Tiempo
                <select
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                >
                  {[15, 30, 60, 120].map((n) => (
                    <option value={n} key={n}>
                      {n} minutos
                    </option>
                  ))}
                </select>
              </label>
              <div className="row-between">
                <span>Total simulado</span>
                <strong className="amount">{money(price)}</strong>
              </div>
              <Button type="submit" disabled={action.busy}>
                Simular pago e iniciar
              </Button>
              <p className="muted">
                La demo permite iniciar a cualquier hora para facilitar las
                pruebas. Aplicá los horarios oficiales antes de una integración
                real.
              </p>
            </form>
          ) : (
            <p>No hay zonas configuradas.</p>
          )}
        </section>
        <section className="panel">
          <h2>
            <Clock size={22} /> Zonas y tarifas demo
          </h2>
          {data.zones.map((z) => (
            <div className="list-row" key={z.id}>
              <div>
                <h3>{z.name}</h3>
                <p>{z.hours}</p>
              </div>
              <strong>{money(z.hourly_rate)}/h</strong>
            </div>
          ))}
          <h3>Historial de sesiones</h3>
          {data.parking.length ? (
            data.parking.map((p) => (
              <div className="list-row" key={p.id}>
                <div>
                  <strong>{p.plate}</strong>
                  <p>
                    {date(p.starts_at)} ·{" "}
                    {data.zones.find((z) => z.id === p.zone_id)?.name}
                  </p>
                  <Status
                    tone={
                      p.status === "active" &&
                      new Date(p.ends_at).getTime() > now
                        ? "good"
                        : ""
                    }
                  >
                    {p.status === "active" &&
                    new Date(p.ends_at).getTime() > now
                      ? "En curso"
                      : "Finalizado"}
                  </Status>
                </div>
                <strong>{money(p.amount)}</strong>
              </div>
            ))
          ) : (
            <p>Todavía no iniciaste un estacionamiento.</p>
          )}
        </section>
      </div>
      {confirm && (
        <PaymentDialog
          title={
            confirm === "extend"
              ? `Extensión de ${minutes} minutos · ${active?.plate}`
              : `${zone?.name} · ${plate} · ${minutes} minutos`
          }
          amount={money(price)}
          busy={action.busy}
          onClose={() => setConfirm(null)}
          onConfirm={() =>
            void action
              .run(
                () =>
                  confirm === "extend" && active
                    ? repo.extendParking(active.id, minutes)
                    : repo.startParking(zone!.id, plate, minutes),
                confirm === "extend"
                  ? "Tiempo extendido. Pago simulado registrado."
                  : "Estacionamiento demo iniciado.",
              )
              .then(() => setConfirm(null))
          }
        />
      )}
    </>
  );
}
