import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { IonApp, IonContent, IonPage } from "@ionic/react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useRegisterSW } from "virtual:pwa-register/react";
import {
  Bell,
  Bike,
  Building2,
  CircleParking,
  FileText,
  Home,
  Menu,
  MessageSquare,
  Phone,
  ShieldCheck,
  UserRound,
  X,
  Download,
  WifiOff,
} from "lucide-react";
import { StoreProvider, useAction, useStore } from "./store";
import type { Repository } from "./services/contracts";
import {
  Button,
  DemoNote,
  Feedback,
  Loading,
  PageTitle,
} from "./components/ui";
import HomePage from "./pages/Home";

const Bikes = lazy(() => import("./pages/Bikes"));
const Taxes = lazy(() => import("./pages/Taxes"));
const Claims = lazy(() => import("./pages/Claims"));
const Contacts = lazy(() => import("./pages/Contacts"));
const Alarms = lazy(() => import("./pages/Alarms"));
const Parking = lazy(() => import("./pages/Parking"));
const Notifications = lazy(() => import("./pages/Notifications"));
const links = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/bicicletas", label: "Bicicletas públicas", icon: Bike },
  { to: "/tributaria", label: "Mis impuestos", icon: FileText },
  { to: "/reclamos", label: "Centro de reclamos", icon: MessageSquare },
  { to: "/contactos", label: "Atención al vecino", icon: Phone },
  { to: "/alarmas", label: "Alarmas comunitarias", icon: ShieldCheck },
  { to: "/estacionamiento", label: "Estacionamiento", icon: CircleParking },
  { to: "/notificaciones", label: "Notificaciones", icon: Bell },
];
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
function subscribeOnline(fn: () => void) {
  window.addEventListener("online", fn);
  window.addEventListener("offline", fn);
  return () => {
    window.removeEventListener("online", fn);
    window.removeEventListener("offline", fn);
  };
}
const getOnline = () => navigator.onLine;
function Brand() {
  return (
    <Link to="/" className="brand">
      <span className="brand-mark">
        <Building2 size={27} strokeWidth={1.7} />
      </span>
      <span>
        San Francisco
        <strong>
          conecta<span className="brand-dot">.</span>
        </strong>
      </span>
    </Link>
  );
}
function Navigation({ onClose }: { onClose?: () => void }) {
  return (
    <nav className="service-navigation" aria-label="Servicios municipales">
      {links.map((l) => (
        <NavLink end={l.to === "/"} key={l.to} to={l.to} onClick={onClose}>
          <l.icon size={20} />
          {l.label}
        </NavLink>
      ))}
    </nav>
  );
}
function MobileMenu({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      className="mobile-menu"
      ref={ref}
      onCancel={onClose}
      aria-labelledby="menu-title"
    >
      <div className="row-between">
        <h2 id="menu-title">Todos los servicios</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Cerrar menú"
        >
          <X />
        </button>
      </div>
      <Navigation onClose={onClose} />
      <Link to="/cuenta" onClick={onClose} className="account-link">
        <UserRound size={20} /> Mi cuenta
      </Link>
    </dialog>
  );
}
function Layout() {
  const { data, repo } = useStore();
  const [menu, setMenu] = useState(false);
  const online = useSyncExternalStore(subscribeOnline, getOnline);
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const {
    needRefresh: [needsUpdate],
    updateServiceWorker,
  } = useRegisterSW();
  const { pathname } = useLocation();
  const scroll = useRef<HTMLIonContentElement>(null);
  useEffect(() => {
    void scroll.current?.scrollToTop(0);
  }, [pathname]);
  useEffect(() => {
    const prompt = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", prompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", prompt);
    };
  }, []);
  const unread =
    data?.notifications.filter(
      (n) => !n.read && new Date(n.visible_at).getTime() <= Date.now(),
    ).length ?? 0;
  return (
    <IonPage>
      <div className="app-shell">
        <aside className="sidebar">
          <Brand />
          <div className="sidebar-label">Tu municipio, a mano</div>
          <Navigation />
          <div className="sidebar-bottom">
            <span className="locality">
              <ShieldCheck size={19} /> Proyecto académico TP5
            </span>
            <p>
              UTN · Facultad Regional
              <br />
              San Francisco
            </p>
            <Link to="/cuenta" className="account-link">
              <UserRound size={19} /> Mi cuenta y privacidad
            </Link>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <div className="mobile-brand">
              <Brand />
            </div>
            <span className="desktop-title">Portal del vecino</span>
            <div className="topbar-actions">
              {install && (
                <button
                  className="text-button install-button"
                  onClick={async () => {
                    await install.prompt();
                    await install.userChoice;
                    setInstall(null);
                  }}
                >
                  <Download size={17} /> Instalar
                </button>
              )}
              <span className="mode-chip">
                {repo.mode === "demo" ? "Demo local" : "Supabase · Datos demo"}
              </span>
              <Link
                className="notification-button icon-button"
                to="/notificaciones"
                aria-label={`Notificaciones, ${unread} sin leer`}
              >
                <Bell size={21} />
                {unread > 0 && <span>{unread}</span>}
              </Link>
              <Link className="avatar" to="/cuenta" aria-label="Mi cuenta">
                <UserRound size={19} />
              </Link>
            </div>
          </header>
          {!online && (
            <div className="offline-bar" role="status">
              <WifiOff size={16} /> Sin conexión.{" "}
              {repo.mode === "demo"
                ? "Podés seguir usando los datos guardados. Los mapas necesitan internet."
                : "Los cambios necesitan conexión con Supabase."}
            </div>
          )}
          {needsUpdate && (
            <div className="update-bar">
              Hay una versión nueva.{" "}
              <button onClick={() => void updateServiceWorker(true)}>
                Actualizar aplicación
              </button>
            </div>
          )}
          <IonContent ref={scroll}>
            <main className="main-content">
              <Suspense fallback={<Loading />}>
                <Outlet />
              </Suspense>
              <footer className="page-footer">
                San Francisco Conecta{" "}
                <span>
                  Proyecto académico · Sin vinculación oficial con el municipio
                </span>
              </footer>
            </main>
          </IonContent>
          <nav className="bottom-navigation" aria-label="Navegación principal">
            <NavLink to="/" end>
              <Home size={21} />
              <span>Inicio</span>
            </NavLink>
            <NavLink to="/bicicletas">
              <Bike size={21} />
              <span>Bicicletas</span>
            </NavLink>
            <NavLink to="/reclamos">
              <MessageSquare size={21} />
              <span>Reclamos</span>
            </NavLink>
            <button onClick={() => setMenu(true)}>
              <Menu size={21} />
              <span>Servicios</span>
            </button>
          </nav>
        </div>
      </div>
      {menu && <MobileMenu onClose={() => setMenu(false)} />}
    </IonPage>
  );
}
function Account() {
  const { user, repo } = useStore();
  const action = useAction();
  const navigate = useNavigate();
  return (
    <>
      <PageTitle
        title="Mi cuenta"
        description="Tu acceso y la información que guardás en la aplicación."
      />
      <Feedback {...action} />
      <section className="panel">
        <h2>{user?.name}</h2>
        <p>{user?.email}</p>
        <DemoNote>
          {repo.mode === "demo"
            ? "Sesión local de demostración. No requiere usuario ni contraseña. Evitá cargar información personal real."
            : "Cuenta autenticada con Supabase. Los servicios municipales y pagos de este proyecto siguen siendo ilustrativos."}
        </DemoNote>
        {repo.mode === "supabase" && (
          <Button
            secondary
            disabled={action.busy}
            onClick={() =>
              void action
                .run(() => repo.signOut(), "Sesión cerrada.")
                .then((ok) => {
                  if (ok) navigate("/");
                })
            }
          >
            Cerrar sesión
          </Button>
        )}
      </section>
      <section className="panel prose">
        <h2>Privacidad y almacenamiento</h2>
        <p>
          En modo demo los datos quedan en este navegador: registros en
          almacenamiento local y adjuntos en IndexedDB. Borrar los datos del
          sitio elimina esa información. No se envían a una API municipal.
        </p>
        <p>
          En modo Supabase la cuenta y los registros se guardan en el proyecto
          configurado. Cada usuario accede a sus propios reclamos, cedulones,
          pagos simulados, preferencias y archivos mediante políticas de acceso.
          Los archivos se abren con enlaces que vencen a los 60 segundos.
        </p>
        <p>
          La geolocalización se solicita únicamente al tocar el botón
          correspondiente. Solo se guarda una ubicación si elegís usarla para
          alertas cercanas; podés eliminarla desde Alarmas. Los mapas solicitan
          teselas a OpenStreetMap, que recibe tu dirección IP y el área
          consultada.
        </p>
        <p>
          Este prototipo no solicita tarjetas, cuentas bancarias ni documentos
          de identidad. Para un uso municipal real se necesita validar las
          integraciones, definir retención y eliminación de datos y revisar los
          requisitos de privacidad aplicables.
        </p>
        <h2>Instalar en el celular</h2>
        <p>
          En Chrome usá «Instalar aplicación» en el menú del navegador. En
          Safari de iPhone usá Compartir y «Agregar a Inicio». La instalación y
          push requieren HTTPS, salvo en localhost. Las funciones disponibles
          dependen del navegador.
        </p>
      </section>
    </>
  );
}
function Login() {
  const { repo } = useStore();
  const action = useAction();
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  return (
    <IonPage>
      <IonContent>
        <div className="login-wrap">
          <Brand />
          <section className="panel">
            <h1>{register ? "Creá tu cuenta" : "Tu ciudad te espera"}</h1>
            <p>Accedé a tus servicios municipales de demostración.</p>
            <Feedback {...action} />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void action.run(
                  async () => {
                    if (register) {
                      const message = await repo.signUp(email, password, name);
                      return message;
                    }
                    await repo.signIn(email, password);
                  },
                  register
                    ? "Cuenta creada. Revisá tu correo para confirmar el acceso."
                    : "Sesión iniciada.",
                );
              }}
            >
              {register && (
                <label>
                  Nombre
                  <input
                    required
                    value={name}
                    maxLength={100}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </label>
              )}
              <label>
                Correo electrónico
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </label>
              <label>
                Contraseña
                <input
                  required
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={register ? "new-password" : "current-password"}
                />
              </label>
              <Button type="submit" disabled={action.busy}>
                {action.busy
                  ? "Conectando…"
                  : register
                    ? "Crear cuenta"
                    : "Iniciar sesión"}
              </Button>
            </form>
            <button
              className="text-button"
              onClick={() => setRegister(!register)}
            >
              {register ? "Ya tengo cuenta" : "Quiero registrarme"}
            </button>
            <DemoNote>
              Usá un correo al que tengas acceso. No uses una contraseña
              compartida con otros servicios.
            </DemoNote>
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
}
function AppRoutes() {
  const { user, loading, error, refresh } = useStore();
  if (loading)
    return (
      <IonPage>
        <IonContent>
          <Loading />
        </IonContent>
      </IonPage>
    );
  if (error)
    return (
      <IonPage>
        <IonContent>
          <div className="login-wrap">
            <Brand />
            <h1>No pudimos cargar tus servicios</h1>
            <Feedback message={error} failed />
            <p>
              Revisá la conexión y la configuración del proyecto. Si usás
              Supabase, aplicá las migraciones antes de iniciar.
            </p>
            <Button onClick={() => void refresh()}>Reintentar</Button>
          </div>
        </IonContent>
      </IonPage>
    );
  if (!user) return <Login />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="bicicletas" element={<Bikes />} />
        <Route path="tributaria" element={<Taxes />} />
        <Route path="reclamos" element={<Claims />} />
        <Route path="contactos" element={<Contacts />} />
        <Route path="alarmas" element={<Alarms />} />
        <Route path="estacionamiento" element={<Parking />} />
        <Route path="notificaciones" element={<Notifications />} />
        <Route path="cuenta" element={<Account />} />
        <Route
          path="*"
          element={
            <>
              <PageTitle
                title="Esta página no existe"
                description="Volvé al inicio para elegir un servicio."
              />
              <Link to="/">Ir al inicio</Link>
            </>
          }
        />
      </Route>
    </Routes>
  );
}
export default function App({ repo }: { repo: Repository }) {
  return (
    <IonApp>
      <BrowserRouter>
        <StoreProvider repo={repo}>
          <AppRoutes />
        </StoreProvider>
      </BrowserRouter>
    </IonApp>
  );
}
