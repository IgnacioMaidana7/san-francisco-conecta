import { IonButton, IonSpinner } from "@ionic/react";
import { useEffect, useRef, type ReactNode } from "react";
import { ArrowLeft, Info } from "lucide-react";
import { Link } from "react-router-dom";

export function Button({
  children,
  onClick,
  disabled,
  type = "button",
  secondary = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  secondary?: boolean;
}) {
  return (
    <IonButton
      type={type}
      disabled={disabled}
      onClick={onClick}
      fill={secondary ? "outline" : "solid"}
    >
      {children}
    </IonButton>
  );
}
export function PageTitle({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <>
      <Link className="back-link" to="/">
        <ArrowLeft size={16} /> Inicio
      </Link>
      <div className="page-heading">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {children}
      </div>
    </>
  );
}
export function Feedback({
  message,
  failed = false,
}: {
  message: string;
  failed?: boolean;
}) {
  return message ? (
    <div
      className={`feedback ${failed ? "error" : "success"}`}
      role={failed ? "alert" : "status"}
    >
      {message}
    </div>
  ) : null;
}
export function DemoNote({ children }: { children?: ReactNode }) {
  return (
    <div className="demo-note">
      <Info size={18} />
      <span>
        {children ??
          "Datos ilustrativos del TP5. Este servicio no está conectado a la Municipalidad."}
      </span>
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <IonSpinner name="crescent" />
      <p>Cargando tus servicios…</p>
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
export function Status({
  children,
  tone = "",
}: {
  children: ReactNode;
  tone?: "good" | "warning" | "danger" | "";
}) {
  return <span className={`status ${tone}`}>{children}</span>;
}
export function PaymentDialog({
  title,
  amount,
  busy,
  onConfirm,
  onClose,
}: {
  title: string;
  amount: string;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
      className="payment-dialog"
      aria-labelledby="payment-title"
    >
      <h2 id="payment-title">Confirmar pago simulado</h2>
      <p>{title}</p>
      <strong className="payment-total">{amount}</strong>
      <DemoNote>
        No se te cobrará dinero. No ingreses datos de tarjetas ni cuentas
        bancarias.
      </DemoNote>
      <div className="actions">
        <Button disabled={busy} secondary onClick={onClose}>
          Cancelar
        </Button>
        <Button disabled={busy} onClick={onConfirm}>
          {busy ? "Registrando…" : "Confirmar pago simulado"}
        </Button>
      </div>
    </dialog>
  );
}
