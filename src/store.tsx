import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Citizen, Snapshot } from "./domain";
import type { Repository } from "./services/contracts";

type Store = {
  repo: Repository;
  user: Citizen | null;
  data: Snapshot | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({
  repo,
  children,
}: {
  repo: Repository;
  children: ReactNode;
}) {
  const [user, setUser] = useState<Citizen | null>(null);
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++revision.current;
    try {
      const current = await repo.getUser();
      const next = current ? await repo.load() : null;
      if (request !== revision.current) return;
      setUser(current);
      setData(next);
      setError("");
    } catch (e) {
      if (request === revision.current)
        setError(
          e instanceof Error
            ? e.message
            : "No se pudieron cargar los servicios.",
        );
    } finally {
      if (request === revision.current) setLoading(false);
    }
  }, [repo]);
  useEffect(() => {
    void refresh();
    return repo.subscribe(() => void refresh());
  }, [repo, refresh]);
  useEffect(() => {
    if (!user) return;
    const check = () => {
      if (document.visibilityState === "visible")
        void repo
          .reminders()
          .then(refresh)
          .catch(() => {
            /* La próxima recarga mostrará el estado de conexión. */
          });
    };
    check();
    const interval = window.setInterval(check, 30000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
    };
  }, [repo, user?.id, refresh]);
  const value = useMemo(
    () => ({ repo, user, data, loading, error, refresh }),
    [repo, user, data, loading, error, refresh],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useStore() {
  const context = useContext(Context);
  if (!context) throw new Error("Falta StoreProvider.");
  return context;
}
export function useAction() {
  const { refresh } = useStore();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const pending = useRef(false);
  async function run(
    action: () => Promise<unknown>,
    success = "Cambios guardados.",
  ) {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    setMessage("");
    try {
      const result = await action();
      await refresh();
      setMessage(typeof result === "string" ? result : success);
      setFailed(false);
      return true;
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : String(
              (e as { message?: string })?.message ??
                "No se pudo completar. Intentá nuevamente.",
            ),
      );
      setFailed(true);
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return { busy, message, failed, run };
}
