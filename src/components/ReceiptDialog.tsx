import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Printer, Download } from "lucide-react";
import { useRef } from "react";

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  concept: string;
  notes: string | null;
  receipt_number: string;
  status: string;
  client_name?: string;
}

interface Props {
  payment: Payment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function buildPrintHTML(payment: Payment, formattedDate: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>Factura ${payment.receipt_number}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:#fff;color:#0f172a;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:760px;margin:0 auto;padding:48px 52px;position:relative}
.page::before{content:'';position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(90deg,#3b82f6,#8b5cf6,#ec4899);border-radius:0 0 3px 3px}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-top:16px;margin-bottom:40px}
.brand{display:flex;align-items:center;gap:16px}
.logo{width:56px;height:56px;background:linear-gradient(135deg,#3b82f6 0%,#8b5cf6 100%);border-radius:16px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(59,130,246,0.3)}
.logo span{color:#fff;font-size:24px;font-weight:800}
.brand-text h1{font-size:24px;font-weight:800;letter-spacing:-0.5px;color:#0f172a}
.brand-text p{font-size:12px;color:#94a3b8;font-weight:600;margin-top:2px;letter-spacing:0.5px}
.invoice-info{text-align:right}
.invoice-label{font-size:28px;font-weight:800;color:#e2e8f0;letter-spacing:-1px;line-height:1}
.invoice-num{font-size:13px;font-weight:700;color:#475569;margin-top:6px}
.invoice-date{font-size:12px;color:#94a3b8;font-weight:500;margin-top:4px}
.status{display:inline-flex;align-items:center;gap:5px;margin-top:10px;padding:5px 16px;border-radius:24px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;background:#ecfdf5;color:#059669;border:1px solid #a7f3d0}
.status::before{content:'✓';font-size:12px}
.section{margin-bottom:32px}
.section-label{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#94a3b8;font-weight:700;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #f1f5f9}
.client-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.client-card{background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-radius:14px;padding:16px 20px;border:1px solid #e2e8f0}
.client-card .label{font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;font-weight:700;margin-bottom:6px}
.client-card .value{font-size:15px;font-weight:700;color:#1e293b}
.items-table{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden;border-radius:14px;border:1px solid #e2e8f0}
.items-table thead{background:linear-gradient(135deg,#f8fafc,#f1f5f9)}
.items-table thead th{font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#64748b;font-weight:700;padding:14px 20px;text-align:left;border-bottom:2px solid #e2e8f0}
.items-table thead th:last-child{text-align:right}
.items-table tbody td{padding:18px 20px;font-size:14px;font-weight:600;color:#1e293b}
.items-table tbody td:last-child{text-align:right;font-size:16px;font-weight:800;color:#3b82f6}
.total-row{display:flex;justify-content:flex-end;margin-top:24px}
.total-box{background:linear-gradient(135deg,#1e293b 0%,#334155 50%,#1e293b 100%);color:#fff;padding:28px 40px;border-radius:20px;text-align:right;min-width:260px;position:relative;overflow:hidden;box-shadow:0 12px 40px rgba(30,41,59,0.3)}
.total-box::before{content:'';position:absolute;top:-50%;right:-20%;width:200px;height:200px;background:radial-gradient(circle,rgba(59,130,246,0.15),transparent);border-radius:50%}
.total-box .t-label{font-size:11px;text-transform:uppercase;letter-spacing:2px;opacity:0.5;font-weight:600;position:relative}
.total-box .t-amount{font-size:38px;font-weight:800;letter-spacing:-1.5px;margin-top:4px;position:relative}
.total-box .t-currency{font-size:18px;font-weight:600;opacity:0.6;vertical-align:top;margin-right:2px}
.notes-box{margin-top:24px;padding:18px 22px;background:#fffbeb;border-radius:14px;border:1px solid #fde68a;border-left:4px solid #f59e0b}
.notes-box .n-label{font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#92400e;font-weight:700;margin-bottom:8px}
.notes-box .n-text{font-size:13px;color:#78350f;line-height:1.7;font-weight:500}
.footer{margin-top:48px;text-align:center;padding-top:28px;border-top:2px solid #f1f5f9}
.footer .thanks{font-size:15px;font-weight:700;color:#475569;margin-bottom:6px}
.footer .legal{font-size:11px;color:#94a3b8;font-weight:500;line-height:1.6}
.footer .brand-mark{display:inline-flex;align-items:center;gap:6px;margin-top:16px;padding:8px 20px;background:#f8fafc;border-radius:20px;border:1px solid #e2e8f0}
.footer .brand-mark span{font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.5px}
.footer .brand-mark .dot{width:6px;height:6px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#8b5cf6)}
@media print{.page{padding:24px 32px}}
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="brand">
      <div class="logo"><span>P</span></div>
      <div class="brand-text">
        <h1>Pago LLC</h1>
        <p>SERVICIOS PROFESIONALES</p>
      </div>
    </div>
    <div class="invoice-info">
      <div class="invoice-label">FACTURA</div>
      <div class="invoice-num">${payment.receipt_number}</div>
      <div class="invoice-date">${formattedDate}</div>
      <div class="status">${payment.status}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-label">Información del Cliente</div>
    <div class="client-grid">
      <div class="client-card">
        <div class="label">Nombre</div>
        <div class="value">${payment.client_name || '—'}</div>
      </div>
      <div class="client-card">
        <div class="label">Fecha de Pago</div>
        <div class="value">${formattedDate}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-label">Detalle de Servicios</div>
    <table class="items-table">
      <thead>
        <tr>
          <th>Concepto</th>
          <th>Monto</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${payment.concept}</td>
          <td>$${payment.amount.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="total-row">
    <div class="total-box">
      <div class="t-label">Total a Pagar</div>
      <div class="t-amount"><span class="t-currency">$</span>${payment.amount.toFixed(2)}</div>
    </div>
  </div>

  ${payment.notes ? `
  <div class="notes-box">
    <div class="n-label">Observaciones</div>
    <div class="n-text">${payment.notes}</div>
  </div>
  ` : ''}

  <div class="footer">
    <div class="thanks">¡Gracias por confiar en nosotros!</div>
    <div class="legal">Este documento sirve como comprobante de pago oficial.<br/>Conserve este recibo para sus registros.</div>
    <div class="brand-mark">
      <div class="dot"></div>
      <span>Pago LLC</span>
    </div>
  </div>
</div>
</body>
</html>`;
}

export function ReceiptDialog({ payment, open, onOpenChange }: Props) {
  const previewRef = useRef<HTMLIFrameElement>(null);

  const handlePrint = () => {
    if (!payment) return;
    const formattedDate = format(parseISO(payment.payment_date), "d 'de' MMMM, yyyy", { locale: es });
    const html = buildPrintHTML(payment, formattedDate);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  if (!payment) return null;

  const formattedDate = format(parseISO(payment.payment_date), "d 'de' MMMM, yyyy", { locale: es });
  const previewHtml = buildPrintHTML(payment, formattedDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 glass-card rounded-2xl border-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="sr-only">Factura</DialogTitle>
        </DialogHeader>

        {/* Live preview in iframe */}
        <div className="px-4 pb-0">
          <iframe
            ref={previewRef}
            srcDoc={previewHtml}
            className="w-full rounded-xl border border-border/30"
            style={{ height: 700 }}
            title="Vista previa de factura"
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 p-4 border-t border-border/50 no-print">
          <Button onClick={handlePrint} className="flex-1 rounded-xl h-11 font-semibold">
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
          <Button variant="outline" onClick={handlePrint} className="flex-1 rounded-xl h-11 font-semibold glass">
            <Download className="mr-2 h-4 w-4" /> Descargar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
