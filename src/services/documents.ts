import type { Bill, Citizen, Payment } from "../domain";
import { date, money } from "../domain";
export async function downloadDocument(item: Bill | Payment, user: Citizen) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const isBill = "concept" in item;
  doc.setFillColor("#133f36");
  doc.rect(0, 0, 210, 44, "F");
  doc.setTextColor("#ffffff");
  doc.setFontSize(23);
  doc.text("San Francisco Conecta", 18, 25);
  doc.setFontSize(11);
  doc.text("Proyecto académico TP5 - UTN San Francisco", 18, 35);
  doc.setTextColor("#133f36");
  doc.setFontSize(20);
  doc.text(
    isBill ? "Cedulón de demostración" : "Comprobante de pago simulado",
    18,
    63,
  );
  doc.setTextColor("#243b34");
  doc.setFontSize(11);
  const lines = [
    `Identificador: ${item.id}`,
    `Vecino: ${user.name}`,
    `Correo: ${user.email}`,
    isBill ? `Concepto: ${item.concept}` : `Concepto: ${item.description}`,
    isBill ? `Período: ${item.period}` : `Referencia: ${item.reference}`,
    isBill
      ? `Vencimiento: ${date(item.due_date)}`
      : `Fecha: ${date(item.created_at)}`,
    `Importe: ${money(item.amount)}`,
    isBill
      ? `Estado: ${item.status === "paid" ? "Pago simulado registrado" : "Pendiente"}`
      : "Estado: pago simulado registrado",
  ];
  let y = 80;
  for (const line of lines) {
    const wrapped = doc.splitTextToSize(line, 174);
    doc.text(wrapped, 18, y);
    y += wrapped.length * 6 + 7;
  }
  doc.setDrawColor("#ccd9d2");
  doc.line(18, y + 5, 192, y + 5);
  doc.setFontSize(12);
  doc.text("SIN VALIDEZ FISCAL. NO UTILIZAR PARA PAGAR.", 18, y + 18);
  doc.setFontSize(10);
  doc.text(
    doc.splitTextToSize(
      "Documento ilustrativo. No acredita una deuda ni un pago ante la Municipalidad. No contiene código de cobro ni datos bancarios.",
      174,
    ),
    18,
    y + 30,
  );
  doc.save(
    `${isBill ? "cedulon" : "comprobante"}-DEMO-${item.id.slice(-8)}.pdf`,
  );
}
