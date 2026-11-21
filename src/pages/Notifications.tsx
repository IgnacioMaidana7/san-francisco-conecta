import { useState } from "react";
import { Bell, Check, Settings2 } from "lucide-react";
import { Link } from "react-router-dom";
import { categories, date, type Category } from "../domain";
import { safeLink } from "../rules";
import {
  Button,
  DemoNote,
  Empty,
  Feedback,
  PageTitle,
  Status,
} from "../components/ui";
import { useAction, useStore } from "../store";
import { disablePush, enablePush, testNotification } from "../services/push";
export default function Notifications() {
  const { data, repo } = useStore();
  const action = useAction();
  const [filter, setFilter] = useState("all");
  if (!data) return null;
  const pref = data.preferences;
  const notices = data.notifications
    .filter(
      (n) =>
        new Date(n.visible_at).getTime() <= Date.now() &&
        (filter === "all" || !n.read),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  async function toggle(category: Category) {
    if (!data) return;
    const current = data.preferences;
    await action.run(() =>
      repo.savePreferences({
        ...current,
        categories: current.categories.includes(category)
          ? current.categories.filter((c) => c !== category)
          : [...current.categories, category],
      }),
    );
  }
  return (
    <>
      <PageTitle
        title="Notificaciones"
        description="Los avisos de tu ciudad, elegidos por vos."
      />
      <Feedback {...action} />
      <div className="two-columns notifications-columns">
        <section>
          <div className="tab-list" role="tablist" aria-label="Historial">
            <button
              role="tab"
              aria-selected={filter === "all"}
              onClick={() => setFilter("all")}
            >
              Todas
            </button>
            <button
              role="tab"
              aria-selected={filter === "unread"}
              onClick={() => setFilter("unread")}
            >
              Sin leer
            </button>
          </div>
          {notices.length ? (
            notices.map((n) => (
              <article
                className={`panel notice ${n.read ? "" : "unread"}`}
                key={n.id}
              >
                <div className="row-between">
                  <span className="notice-category">
                    <Bell size={16} /> {categories[n.category]}
                  </span>
                  <small>{date(n.created_at)}</small>
                </div>
                <h2>{n.title}</h2>
                <p>{n.body}</p>
                <div className="row-between">
                  <Link
                    className="text-link"
                    to={safeLink(n.link)}
                    onClick={() =>
                      void action.run(
                        () => repo.readNotice(n.id),
                        "Aviso marcado como leído.",
                      )
                    }
                  >
                    Más información
                  </Link>
                  {!n.read ? (
                    <button
                      className="text-button"
                      disabled={action.busy}
                      onClick={() =>
                        void action.run(
                          () => repo.readNotice(n.id),
                          "Aviso marcado como leído.",
                        )
                      }
                    >
                      <Check size={16} /> Marcar leído
                    </button>
                  ) : (
                    <Status>Leído</Status>
                  )}
                </div>
              </article>
            ))
          ) : (
            <Empty>
              No hay avisos en esta vista. Los nuevos aparecerán aquí.
            </Empty>
          )}
          {repo.mode === "demo" && (
            <Button
              secondary
              disabled={action.busy}
              onClick={() =>
                void action.run(
                  () => repo.simulate("notice"),
                  "Evento de prueba generado. Se entregará según tus categorías, zonas y frecuencia.",
                )
              }
            >
              Generar aviso de obras demo
            </Button>
          )}
        </section>
        <section className="panel preferences">
          <h2>
            <Settings2 size={22} /> Mis preferencias
          </h2>
          <h3>Qué quiero recibir</h3>
          {Object.entries(categories).map(([key, label]) => (
            <label className="checkbox-row" key={key}>
              <input
                type="checkbox"
                checked={pref.categories.includes(key as Category)}
                disabled={action.busy}
                onChange={() => void toggle(key as Category)}
              />
              {label}
            </label>
          ))}
          <label>
            Frecuencia
            <select
              disabled={action.busy}
              value={pref.frequency}
              onChange={(e) =>
                void action.run(() =>
                  repo.savePreferences({
                    ...pref,
                    frequency: e.target.value as typeof pref.frequency,
                  }),
                )
              }
            >
              <option value="immediate">En el momento</option>
              <option value="daily">Resumen a las 24 horas</option>
              <option value="off">Pausar nuevos avisos</option>
            </select>
          </label>
          <label>
            Radio de alertas cercanas
            <select
              disabled={action.busy}
              value={pref.nearby_km}
              onChange={(e) =>
                void action.run(() =>
                  repo.savePreferences({
                    ...pref,
                    nearby_km: Number(e.target.value),
                  }),
                )
              }
            >
              {[1, 2, 5].map((n) => (
                <option value={n} key={n}>
                  {n} km
                </option>
              ))}
            </select>
          </label>
          <p>
            Zonas: {pref.zones.join(", ") || "Ninguna"}.{" "}
            <Link to="/alarmas">Administrar zonas y ubicación</Link>
          </p>
          <hr />
          <h3>Notificaciones del dispositivo</h3>
          <p>
            Los avisos del historial funcionan sin permisos. Para recibirlos con
            la app cerrada, configurá el servicio push.
          </p>
          <div className="stack-actions">
            <Button
              disabled={action.busy}
              onClick={() =>
                void action.run(
                  () => enablePush(repo),
                  "Notificaciones push habilitadas en este dispositivo.",
                )
              }
            >
              Activar push
            </Button>
            <Button
              secondary
              disabled={action.busy}
              onClick={() =>
                void action.run(
                  testNotification,
                  "Notificación local enviada. No utiliza el servidor push.",
                )
              }
            >
              Probar aviso local
            </Button>
            <button
              className="text-button"
              disabled={action.busy}
              onClick={() =>
                void action.run(
                  () => disablePush(repo),
                  "Suscripción del dispositivo eliminada.",
                )
              }
            >
              Desactivar push del dispositivo
            </button>
          </div>
          <DemoNote>
            Los avisos simulados son para probar la aplicación. No describen
            incidentes reales.
          </DemoNote>
        </section>
      </div>
    </>
  );
}
