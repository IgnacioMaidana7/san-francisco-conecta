import { useState } from "react";
import { Paperclip, Search, Plus, FileText, Check } from "lucide-react";
import {
  Button,
  DemoNote,
  Empty,
  Feedback,
  PageTitle,
  Status,
} from "../components/ui";
import { date, type Attachment } from "../domain";
import { useAction, useStore } from "../store";
export default function Claims() {
  const { data, repo } = useStore();
  const action = useAction();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const [category, setCategory] = useState("Alumbrado");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  async function download(file: Attachment) {
    const url = await repo.attachmentUrl(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.target = "_blank";
    link.rel = "noopener";
    link.click();
    if (url.startsWith("blob:"))
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  if (!data) return null;
  const claims = data.claims
    .filter(
      (c) =>
        (status === "todos" || c.status === status) &&
        `${c.id} ${c.description} ${c.address} ${c.category}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <>
      <PageTitle
        title="Centro de reclamos"
        description="Contanos qué pasa en tu barrio y seguí cada actualización."
      >
        <Button onClick={() => setOpen(!open)}>
          <Plus size={18} /> {open ? "Cerrar formulario" : "Nuevo reclamo"}
        </Button>
      </PageTitle>
      <DemoNote />
      <Feedback {...action} />
      {open && (
        <section className="panel">
          <h2>Nuevo reclamo</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await action.run(
                  () => repo.createClaim(category, description, address, files),
                  "Reclamo registrado. Ya podés seguirlo en la lista.",
                )
              ) {
                setOpen(false);
                setDescription("");
                setAddress("");
                setFiles([]);
              }
            }}
          >
            <div className="form-grid">
              <label>
                Tipo de reclamo
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {[
                    "Alumbrado",
                    "Limpieza",
                    "Calles y veredas",
                    "Espacios verdes",
                    "Otros",
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Dirección o referencia
                <input
                  required
                  minLength={5}
                  maxLength={200}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Calle y altura"
                  autoComplete="street-address"
                />
              </label>
            </div>
            <label>
              Descripción
              <textarea
                required
                minLength={10}
                maxLength={2000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describí el problema con el mayor detalle posible."
              />
            </label>
            <label className="upload-field">
              <Paperclip size={20} /> Fotos o documentos
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              />
              <small>
                Hasta 3 archivos JPG, PNG, WebP o PDF. Máximo 5 MB por archivo.
              </small>
            </label>
            {files.length > 0 && <p>{files.map((f) => f.name).join(", ")}</p>}
            <Button type="submit" disabled={action.busy}>
              {action.busy ? "Enviando…" : "Registrar reclamo"}
            </Button>
          </form>
        </section>
      )}
      <div className="filters">
        <label className="search-field">
          <Search size={19} />
          <input
            aria-label="Buscar reclamos"
            placeholder="Buscar por número, dirección o descripción"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          Estado
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="todos">Todos los estados</option>
            <option>recibido</option>
            <option>en curso</option>
            <option>resuelto</option>
          </select>
        </label>
      </div>
      {claims.length ? (
        claims.map((c) => (
          <article className="panel claim" key={c.id}>
            <div className="row-between">
              <span className="muted">
                Reclamo #{c.id.slice(-8)} · {date(c.created_at)}
              </span>
              <Status tone={c.status === "resuelto" ? "good" : "warning"}>
                {c.status}
              </Status>
            </div>
            <h2>{c.category}</h2>
            <p>{c.description}</p>
            <p className="muted">{c.address}</p>
            {c.attachments.length > 0 && (
              <div className="attachment-list">
                {c.attachments.map((f) => (
                  <button
                    className="text-button"
                    key={f.path}
                    disabled={action.busy}
                    onClick={() =>
                      void action.run(() => download(f), "Archivo abierto.")
                    }
                  >
                    <FileText size={17} /> {f.name}
                  </button>
                ))}
              </div>
            )}
            <details>
              <summary>Ver seguimiento ({c.events.length})</summary>
              <ol className="timeline">
                {c.events.map((event, i) => (
                  <li key={`${event.at}-${i}`}>
                    <span className="timeline-icon">
                      <Check size={14} />
                    </span>
                    <div>
                      <strong>{event.status}</strong>
                      <p>{event.detail}</p>
                      <small>
                        {date(event.at)} ·{" "}
                        {new Date(event.at).toLocaleTimeString("es-AR")}
                      </small>
                    </div>
                  </li>
                ))}
              </ol>
            </details>
            {repo.mode === "demo" && c.status !== "resuelto" && (
              <button
                className="text-button"
                disabled={action.busy}
                onClick={() =>
                  void action.run(
                    () => repo.simulate("claim", c.id),
                    "Estado actualizado por el operador simulado.",
                  )
                }
              >
                Simular avance del reclamo
              </button>
            )}
          </article>
        ))
      ) : (
        <Empty>
          No encontramos reclamos. Podés cambiar los filtros o registrar uno
          nuevo.
        </Empty>
      )}
    </>
  );
}
