import {
  Bike,
  Bell,
  FileText,
  MessageSquare,
  Phone,
  ShieldCheck,
  CircleParking,
  MapPin,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import { date, money } from "../domain";

const services = [
  {
    path: "/bicicletas",
    icon: Bike,
    name: "Bicicletas públicas",
    text: "Encontrá tu próxima bici",
    color: "green",
  },
  {
    path: "/tributaria",
    icon: FileText,
    name: "Mis impuestos",
    text: "Cedulones y pagos",
    color: "blue",
  },
  {
    path: "/reclamos",
    icon: MessageSquare,
    name: "Reclamos",
    text: "Hacete escuchar",
    color: "orange",
  },
  {
    path: "/contactos",
    icon: Phone,
    name: "Atención al vecino",
    text: "Estamos para ayudarte",
    color: "blue",
  },
  {
    path: "/alarmas",
    icon: ShieldCheck,
    name: "Alarmas comunitarias",
    text: "Conectados en tu barrio",
    color: "green",
  },
  {
    path: "/estacionamiento",
    icon: CircleParking,
    name: "Estacionamiento",
    text: "Tu tiempo, desde acá",
    color: "orange",
  },
];
function CityIllustration() {
  return (
    <svg
      className="city-illustration"
      viewBox="0 0 400 210"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="310" cy="58" r="28" fill="#d7f19e" />
      <path
        d="M15 179H385M63 179V96L124 61L185 96V179M81 103H167M87 119V157M124 119V157M161 119V157M51 96H197M124 61V37M124 37H150V49H124M205 179V118H275V179M217 130H230V144H217M250 130H263V144H250M292 179V126M292 126C258 126 264 78 292 78C320 78 326 126 292 126Z"
        stroke="#99bc99"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M45 179V137M45 137C18 137 21 99 45 99C69 99 72 137 45 137Z"
        stroke="#99bc99"
        strokeWidth="3"
      />
      <g stroke="#d7f19e" strokeWidth="3">
        <circle cx="312" cy="178" r="20" />
        <circle cx="371" cy="178" r="20" />
        <path
          d="M312 178L328 147L348 178H312L340 155M328 147H318M348 178L357 140H348M356 140H369"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
export default function Home() {
  const { data } = useStore();
  if (!data) return null;
  const bill = data.bills
    .filter((b) => b.status === "pending")
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
  const latest = data.notifications
    .filter((n) => new Date(n.visible_at).getTime() <= Date.now())
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const active = data.parking.find(
    (p) => p.status === "active" && new Date(p.ends_at).getTime() > Date.now(),
  );
  return (
    <>
      <div className="welcome-line">
        <span>
          <MapPin size={16} /> San Francisco, Córdoba
        </span>
        <span>
          {new Intl.DateTimeFormat("es-AR", {
            day: "numeric",
            month: "long",
          }).format(new Date())}
        </span>
      </div>
      <section className="city-hero">
        <div>
          <h1>
            Tu ciudad.
            <br />
            Más cerca.
          </h1>
          <p>
            Lo que necesitás del municipio,
            <br className="desktop-only" /> en un solo lugar.
          </p>
          <Link className="hero-link" to="/reclamos">
            Hacer un reclamo <MessageSquare size={18} />
          </Link>
        </div>
        <CityIllustration />
      </section>
      <div className="home-columns">
        <div>
          <div className="section-heading">
            <h2>¿Qué necesitás hacer?</h2>
            <span>Servicios municipales</span>
          </div>
          <div className="service-grid">
            {services.map((s) => (
              <Link to={s.path} key={s.path} className="service-card">
                <span className={`service-icon ${s.color}`}>
                  <s.icon size={25} strokeWidth={1.8} />
                </span>
                <h3>{s.name}</h3>
                <p>{s.text}</p>
                <ChevronRight className="service-chevron" size={18} />
              </Link>
            ))}
          </div>
          <section className="neighborhood-strip">
            <ShieldCheck size={28} />
            <div>
              <h3>Un barrio más conectado</h3>
              <p>Elegí tus zonas y recibí los avisos que te interesan.</p>
            </div>
            <Link to="/notificaciones">Mis preferencias</Link>
          </section>
        </div>
        <aside className="home-aside">
          <section className="aside-block">
            <div className="section-heading">
              <h2>Para tener en cuenta</h2>
              <CalendarDays size={19} />
            </div>
            {active ? (
              <Link className="reminder-link" to="/estacionamiento">
                <span className="status good">En curso</span>
                <h3>Estacionamiento {active.plate}</h3>
                <p>Consultá tu tiempo y extendelo.</p>
              </Link>
            ) : bill ? (
              <Link className="reminder-link" to="/tributaria">
                <span className="status warning">Próximo vencimiento</span>
                <h3>{bill.concept}</h3>
                <strong className="amount">{money(bill.amount)}</strong>
                <p>Vence el {date(bill.due_date)}</p>
                <span className="text-link">
                  Ver mis cedulones <ChevronRight size={16} />
                </span>
              </Link>
            ) : (
              <p>Tenés tus impuestos al día.</p>
            )}
          </section>
          <section className="aside-block city-news">
            <Bell size={22} />
            <h2>Novedades para vos</h2>
            {latest ? (
              <>
                <h3>{latest.title}</h3>
                <p>{latest.body}</p>
              </>
            ) : (
              <p>No hay avisos nuevos. Podés ajustar tus preferencias.</p>
            )}
            <Link to="/notificaciones" className="text-link">
              Ver notificaciones <ChevronRight size={16} />
            </Link>
          </section>
          <p className="academic-caption">
            Una ciudad conectada se construye entre todos.
            <br />
            <strong>Proyecto académico · UTN San Francisco</strong>
          </p>
        </aside>
      </div>
    </>
  );
}
