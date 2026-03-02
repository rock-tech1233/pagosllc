import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Printer, Download, CheckCircle } from "lucide-react";
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

const printStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    padding: 0; margin: 0;
    background: #fff;
    color: #0f172a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .invoice {
    max-width: 680px;
    margin: 0 auto;
    padding: 48px 40px;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 36px;
  }
  .brand-logo {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #3b82f6, #6366f1);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -1px;
    margin-bottom: 12px;
  }
  .brand h1 {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: #0f172a;
  }
  .brand p {
    font-size: 12px;
    color: #94a3b8;
    margin-top: 2px;
    font-weight: 500;
  }
  .invoice-meta {
    text-align: right;
  }
  .invoice-meta .label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #94a3b8;
    font-weight: 700;
  }
  .invoice-meta .number {
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
    margin-top: 4px;
  }
  .invoice-meta .date {
    font-size: 12px;
    color: #64748b;
    margin-top: 6px;
    font-weight: 500;
  }
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 14px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: linear-gradient(135deg, #dcfce7, #bbf7d0);
    color: #166534;
    margin-top: 10px;
  }
  .divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, #e2e8f0 20%, #e2e8f0 80%, transparent);
    margin: 24px 0;
  }
  .section-title {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #94a3b8;
    font-weight: 700;
    margin-bottom: 14px;
  }
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .info-item {
    background: #f8fafc;
    border-radius: 10px;
    padding: 12px 16px;
    border: 1px solid #f1f5f9;
  }
  .info-item .label {
    font-size: 10px;
    color: #94a3b8;
    font-weight: 700;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .info-item .value {
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
  }
  .line-items {
    width: 100%;
    border-collapse: collapse;
  }
  .line-items thead th {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #94a3b8;
    font-weight: 700;
    padding: 10px 0;
    border-bottom: 2px solid #f1f5f9;
    text-align: left;
  }
  .line-items thead th:last-child {
    text-align: right;
  }
  .line-items tbody td {
    padding: 16px 0;
    font-size: 14px;
    font-weight: 500;
    border-bottom: 1px solid #f1f5f9;
  }
  .line-items tbody td:last-child {
    text-align: right;
    font-weight: 700;
    font-size: 15px;
  }
  .total-section {
    display: flex;
    justify-content: flex-end;
    margin-top: 28px;
  }
  .total-box {
    background: linear-gradient(135deg, #3b82f6, #6366f1);
    color: #fff;
    padding: 24px 36px;
    border-radius: 16px;
    text-align: right;
    min-width: 220px;
    box-shadow: 0 8px 30px rgba(59, 130, 246, 0.3);
  }
  .total-box .total-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    opacity: 0.8;
    font-weight: 600;
  }
  .total-box .total-amount {
    font-size: 34px;
    font-weight: 800;
    margin-top: 4px;
    letter-spacing: -1px;
  }
  .notes-section {
    margin-top: 24px;
    padding: 16px 20px;
    background: #f8fafc;
    border-radius: 12px;
    border-left: 3px solid #3b82f6;
  }
  .notes-section .label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #94a3b8;
    font-weight: 700;
    margin-bottom: 6px;
  }
  .notes-section .value {
    font-size: 13px;
    color: #475569;
    line-height: 1.6;
    font-weight: 500;
  }
  .footer {
    margin-top: 48px;
    text-align: center;
    padding-top: 24px;
    border-top: 1px solid #f1f5f9;
  }
  .footer .thanks {
    font-size: 14px;
    font-weight: 700;
    color: #475569;
    margin-bottom: 4px;
  }
  .footer .legal {
    font-size: 11px;
    color: #94a3b8;
    font-weight: 500;
  }
  @media print {
    body { padding: 0; }
    .invoice { padding: 24px; }
  }
`;

export function ReceiptDialog({ payment, open, onOpenChange }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html><head>
        <meta charset="utf-8" />
        <title>Factura ${payment?.receipt_number}</title>
        <style>${printStyles}</style>
      </head><body>
        ${content.innerHTML}
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  if (!payment) return null;

  const formattedDate = format(parseISO(payment.payment_date), "d 'de' MMMM, yyyy", { locale: es });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 glass-card rounded-2xl border-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="sr-only">Factura</DialogTitle>
        </DialogHeader>

        <div ref={printRef}>
          <div className="invoice" style={{ maxWidth: 680, margin: "0 auto", padding: "32px 28px" }}>
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
                  <span className="text-primary font-extrabold text-lg">P</span>
                </div>
                <h1 className="text-xl font-extrabold tracking-tight">Pago LLC</h1>
                <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">Servicios Profesionales</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-bold">Factura</p>
                <p className="text-sm font-bold mt-1">{payment.receipt_number}</p>
                <p className="text-xs text-muted-foreground mt-1.5 font-medium">{formattedDate}</p>
                <span className="inline-flex items-center gap-1 mt-2.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <CheckCircle className="h-3 w-3" />
                  {payment.status}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-6" />

            {/* Client info */}
            <div className="mb-6">
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-bold mb-3">Datos del cliente</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/50 p-3 border border-border/50">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Nombre</p>
                  <p className="text-sm font-semibold">{payment.client_name || "—"}</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3 border border-border/50">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Fecha de pago</p>
                  <p className="text-sm font-semibold">{formattedDate}</p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-6" />

            {/* Line items */}
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-bold mb-3">Detalle</p>
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-muted">
                    <th className="text-left text-[10px] uppercase tracking-wider text-muted-foreground font-bold pb-2.5">Concepto</th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-muted-foreground font-bold pb-2.5">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-muted/50">
                    <td className="py-4 text-sm font-medium">{payment.concept}</td>
                    <td className="py-4 text-sm font-bold text-right">${payment.amount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="flex justify-end mt-7">
              <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-2xl px-8 py-5 text-right min-w-[220px] shadow-lg shadow-primary/20">
                <p className="text-[10px] uppercase tracking-[0.15em] opacity-70 font-bold">Total</p>
                <p className="text-3xl font-extrabold tracking-tight mt-1">${payment.amount.toFixed(2)}</p>
              </div>
            </div>

            {/* Notes */}
            {payment.notes && (
              <div className="mt-6 p-4 bg-muted/40 rounded-xl border-l-[3px] border-primary/30">
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-bold mb-1.5">Notas</p>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium">{payment.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-10 text-center pt-6 border-t border-border/50">
              <p className="text-sm font-bold text-muted-foreground">¡Gracias por su pago!</p>
              <p className="text-[11px] text-muted-foreground/60 mt-1 font-medium">Este documento sirve como comprobante de pago oficial.</p>
            </div>
          </div>
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
