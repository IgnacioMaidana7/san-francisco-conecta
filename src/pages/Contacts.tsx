import { useState } from "react";
import { Clock, Mail, MessageCircle, Phone, Search } from "lucide-react";
import { DemoNote, Empty, PageTitle } from "../components/ui";
import { useStore } from "../store";
export default function Contacts() {
  const { data } = useStore();
  const [search, setSearch] = useState("");
  if (!data) return null;
  const contacts = data.contacts.filter((c) =>
    `${c.name} ${c.description}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        title="Atención al vecino"
        description="Encontrá el área indicada para tu consulta."
      />
      <DemoNote>
        Estos enlaces abren canales reales publicados por el municipio.
        Directorio consultado el 21/11/2026; confirmá su vigencia en el sitio
        oficial antes de comunicarte.
      </DemoNote>
      <p className="muted">
        Fuentes:{" "}
        <a
          href="https://www.sanfrancisco.gov.ar/contenidos/telefonos-utiles-355"
          target="_blank"
          rel="noopener noreferrer"
        >
          Teléfonos útiles
        </a>{" "}
        y{" "}
        <a
          href="https://www.sanfrancisco.gov.ar/contenidos/contactos-356"
          target="_blank"
          rel="noopener noreferrer"
        >
          Contactos y Tana
        </a>
        .
      </p>
      <label className="search-field">
        <Search size={19} />
        <input
          aria-label="Buscar un área municipal"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar área o servicio"
        />
      </label>
      <div className="contact-grid">
        {contacts.map((c) => (
          <article className="panel contact" key={c.id}>
            <div className="service-icon blue">
              <Phone size={24} />
            </div>
            <h2>{c.name}</h2>
            <p>{c.description}</p>
            <p className="contact-hours">
              <Clock size={16} /> {c.hours}
            </p>
            <div className="contact-actions">
              {c.phone && /^\+?[0-9 ()-]{6,20}$/.test(c.phone) ? (
                <a href={`tel:${c.phone.replace(/[^+\d]/g, "")}`}>
                  <Phone size={17} /> Llamar
                </a>
              ) : (
                <span>Teléfono pendiente</span>
              )}
              {c.email &&
              /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email) &&
              !c.email.endsWith(".invalid") ? (
                <a href={`mailto:${c.email}`}>
                  <Mail size={17} /> Escribir correo
                </a>
              ) : (
                <span>Correo no publicado</span>
              )}
              {c.whatsapp && /^\d{10,15}$/.test(c.whatsapp) ? (
                <a
                  href={`https://wa.me/${c.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle size={17} /> WhatsApp
                </a>
              ) : (
                <span>WhatsApp no publicado</span>
              )}
            </div>
          </article>
        ))}
      </div>
      {!contacts.length && (
        <Empty>No encontramos esa área. Probá con otra palabra.</Empty>
      )}
      <section className="panel">
        <h2>¿Querés informar un problema en tu barrio?</h2>
        <p>
          Registralo en el Centro de reclamos para obtener un número de
          seguimiento.
        </p>
        <a className="text-link" href="/reclamos">
          Ir al Centro de reclamos
        </a>
      </section>
    </>
  );
}
