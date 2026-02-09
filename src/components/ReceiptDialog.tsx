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

const printStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    padding: 0; margin: 0;
    background: #fff;
    color: #1a1a2e;
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
    margin-bottom: 40px;
  }
  .brand h1 {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.5px;
    color: #1a1a2e;
  }
  .brand p {
    font-size: 13px;
    color: #6b7280;
    margin-top: 4px;
  }
  .invoice-meta {
    text-align: right;
  }
  .invoice-meta .label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #9ca3af;
    font-weight: 600;
  }
  .invoice-meta .number {
    font-size: 15px;
    font-weight: 600;
    color: #1a1a2e;
    margin-top: 2px;
  }
  .invoice-meta .date {
    font-size: 13px;
    color: #6b7280;
    margin-top: 6px;
  }
  .status-badge {
    display: inline-block;
    padding: 4px 14px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: #dcfce7;
    color: #166534;
    margin-top: 8px;
  }
  .divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, #e5e7eb 20%, #e5e7eb 80%, transparent);
    margin: 28px 0;
  }
  .section-title {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: #9ca3af;
    font-weight: 600;
    margin-bottom: 16px;
  }
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  .info-item .label {
    font-size: 12px;
    color: #9ca3af;
    font-weight: 500;
    margin-bottom: 4px;
  }
  .info-item .value {
    font-size: 14px;
    font-weight: 500;
    color: #1a1a2e;
  }
  .line-items {
    width: 100%;
    border-collapse: collapse;
  }
  .line-items thead th {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #9ca3af;
    font-weight: 600;
    padding: 10px 0;
    border-bottom: 2px solid #f3f4f6;
    text-align: left;
  }
  .line-items thead th:last-child {
    text-align: right;
  }
  .line-items tbody td {
    padding: 14px 0;
    font-size: 14px;
    border-bottom: 1px solid #f3f4f6;
  }
  .line-items tbody td:last-child {
    text-align: right;
    font-weight: 600;
  }
  .total-section {
    display: flex;
    justify-content: flex-end;
    margin-top: 24px;
  }
  .total-box {
    background: linear-gradient(135deg, #1a1a2e 0%, #2d2b55 100%);
    color: #fff;
    padding: 20px 32px;
    border-radius: 12px;
    text-align: right;
    min-width: 220px;
  }
  .total-box .total-label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
    opacity: 0.7;
    font-weight: 500;
  }
  .total-box .total-amount {
    font-size: 32px;
    font-weight: 700;
    margin-top: 4px;
    letter-spacing: -1px;
  }
  .notes-section {
    margin-top: 28px;
    padding: 16px 20px;
    background: #f9fafb;
    border-radius: 8px;
    border-left: 3px solid #e5e7eb;
  }
  .notes-section .label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #9ca3af;
    font-weight: 600;
    margin-bottom: 6px;
  }
  .notes-section .value {
    font-size: 13px;
    color: #4b5563;
    line-height: 1.5;
  }
  .footer {
    margin-top: 48px;
    text-align: center;
    font-size: 12px;
    color: #9ca3af;
  }
  .footer .thanks {
    font-size: 14px;
    font-weight: 600;
    color: #6b7280;
    margin-bottom: 8px;
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="sr-only">Factura</DialogTitle>
        </DialogHeader>

        <div ref={printRef}>
          <div className="invoice" style={{ maxWidth: 680, margin: "0 auto", padding: "32px 28px" }}>
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Pago LLC</h1>
                <p className="text-xs text-muted-foreground mt-1">Servicios Profesionales</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Factura</p>
                <p className="text-sm font-semibold mt-0.5">{payment.receipt_number}</p>
                <p className="text-xs text-muted-foreground mt-1">{formattedDate}</p>
                <span className="inline-block mt-2 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  {payment.status}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-6" />

            {/* Client info */}
            <div className="mb-6">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">Datos del cliente</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-muted-foreground mb-0.5">Nombre</p>
                  <p className="text-sm font-medium">{payment.client_name || "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-0.5">Fecha de pago</p>
                  <p className="text-sm font-medium">{formattedDate}</p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-6" />

            {/* Line items */}
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">Detalle</p>
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-muted">
                    <th className="text-left text-[10px] uppercase tracking-wide text-muted-foreground font-semibold pb-2">Concepto</th>
                    <th className="text-right text-[10px] uppercase tracking-wide text-muted-foreground font-semibold pb-2">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-muted/50">
                    <td className="py-3 text-sm">{payment.concept}</td>
                    <td className="py-3 text-sm font-semibold text-right">${payment.amount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="flex justify-end mt-6">
              <div className="bg-foreground text-background rounded-xl px-7 py-4 text-right min-w-[200px]">
                <p className="text-[11px] uppercase tracking-wide opacity-60 font-medium">Total</p>
                <p className="text-3xl font-bold tracking-tight mt-0.5">${payment.amount.toFixed(2)}</p>
              </div>
            </div>

            {/* Notes */}
            {payment.notes && (
              <div className="mt-6 p-4 bg-muted/50 rounded-lg border-l-[3px] border-muted-foreground/20">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">Notas</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{payment.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-10 text-center">
              <p className="text-sm font-semibold text-muted-foreground">¡Gracias por su pago!</p>
              <p className="text-[11px] text-muted-foreground/60 mt-1">Este documento sirve como comprobante de pago oficial.</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 p-4 border-t no-print">
          <Button onClick={handlePrint} className="flex-1">
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
          <Button variant="outline" onClick={handlePrint} className="flex-1">
            <Download className="mr-2 h-4 w-4" /> Descargar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
