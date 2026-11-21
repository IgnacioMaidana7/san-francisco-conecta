import { useState } from "react";
import { Download, FileCheck2 } from "lucide-react";
import {
  Button,
  DemoNote,
  Empty,
  Feedback,
  PageTitle,
  PaymentDialog,
  Status,
} from "../components/ui";
import { date, money, type Bill } from "../domain";
import { useAction, useStore } from "../store";
import { downloadDocument } from "../services/documents";
export default function Taxes() {
  const { data, repo, user } = useStore();
  const action = useAction();
  const [pay, setPay] = useState<Bill | null>(null);
  const [tab, setTab] = useState("bills");
  if (!data || !user) return null;
  const pending = data.bills.filter((b) => b.status === "pending");
  return (
    <>
      <PageTitle
        title="Mis impuestos"
        description="Consultá tus obligaciones, emití cedulones y revisá tus pagos."
      />
      <DemoNote>
        Todos los importes son ilustrativos. Los pagos son simulados y los
        cedulones no tienen validez fiscal.
      </DemoNote>
      <Feedback {...action} />
      <section className="balance-strip">
        <FileCheck2 size={30} />
        <div>
          <span>Total pendiente · Demo</span>
          <strong>
            {money(pending.reduce((sum, b) => sum + b.amount, 0))}
          </strong>
        </div>
        <span>{pending.length} obligaciones pendientes</span>
      </section>
      <div
        className="tab-list"
        role="tablist"
        aria-label="Información tributaria"
      >
        <button
          role="tab"
          aria-selected={tab === "bills"}
          onClick={() => setTab("bills")}
        >
          Mis cedulones
        </button>
        <button
          role="tab"
          aria-selected={tab === "history"}
          onClick={() => setTab("history")}
        >
          Historial de pagos
        </button>
      </div>
      {tab === "bills" ? (
        <div className="bill-list">
          {data.bills.map((b) => (
            <article key={b.id} className="panel bill">
              <div className="row-between">
                <Status tone={b.status === "paid" ? "good" : "warning"}>
                  {b.status === "paid"
                    ? "Pago simulado"
                    : new Date(`${b.due_date}T23:59:59-03:00`).getTime() <
                        Date.now()
                      ? "Vencido"
                      : "Pendiente"}
                </Status>
                <span>{b.period}</span>
              </div>
              <h2>{b.concept}</h2>
              <p>Vencimiento: {date(b.due_date)}</p>
              <div className="row-between bill-actions">
                <strong className="amount">{money(b.amount)}</strong>
                <div className="actions">
                  <Button
                    secondary
                    disabled={action.busy}
                    onClick={() =>
                      void action.run(
                        () => downloadDocument(b, user),
                        "Cedulón PDF descargado.",
                      )
                    }
                  >
                    <Download size={16} /> Cedulón PDF
                  </Button>
                  {b.status === "pending" && (
                    <Button disabled={action.busy} onClick={() => setPay(b)}>
                      Simular pago
                    </Button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="panel">
          {data.payments.length ? (
            data.payments.map((p) => (
              <article className="list-row" key={p.id}>
                <div>
                  <strong>{p.description}</strong>
                  <p>
                    {date(p.created_at)} · {p.reference}
                  </p>
                  <Status>Pago simulado</Status>
                </div>
                <div>
                  <strong>{money(p.amount)}</strong>
                  <Button
                    secondary
                    disabled={action.busy}
                    onClick={() =>
                      void action.run(
                        () => downloadDocument(p, user),
                        "Comprobante PDF descargado.",
                      )
                    }
                  >
                    <Download size={16} /> Comprobante
                  </Button>
                </div>
              </article>
            ))
          ) : (
            <Empty>Todavía no registraste pagos simulados.</Empty>
          )}
        </section>
      )}
      {pay && (
        <PaymentDialog
          title={`${pay.concept} · ${pay.period}`}
          amount={money(pay.amount)}
          busy={action.busy}
          onClose={() => setPay(null)}
          onConfirm={() =>
            void action
              .run(
                () => repo.payBill(pay.id),
                "Pago simulado registrado. El historial incluye tu comprobante.",
              )
              .then(() => setPay(null))
          }
        />
      )}
      <p className="muted">
        Los recordatorios se generan según tus preferencias de vencimientos en
        Notificaciones.
      </p>
    </>
  );
}
