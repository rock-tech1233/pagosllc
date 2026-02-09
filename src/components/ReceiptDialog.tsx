import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Printer } from "lucide-react";
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

export function ReceiptDialog({ payment, open, onOpenChange }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Recibo ${payment?.receipt_number}</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 40px; max-width: 600px; margin: auto; }
        h1 { font-size: 24px; margin-bottom: 4px; }
        .subtitle { color: #666; margin-bottom: 24px; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .label { color: #666; }
        .amount { font-size: 28px; font-weight: bold; text-align: center; margin: 24px 0; }
      </style></head><body>
      ${content.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Recibo de Pago</DialogTitle>
        </DialogHeader>

        <div ref={printRef}>
          <div className="space-y-1 text-center">
            <h1 className="text-xl font-bold">Recibo de Pago</h1>
            <p className="text-sm text-muted-foreground">{payment.receipt_number}</p>
          </div>

          <Separator className="my-4" />

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fecha</span>
              <span>{format(parseISO(payment.payment_date), "d 'de' MMMM yyyy", { locale: es })}</span>
            </div>
            {payment.client_name && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente</span>
                <span>{payment.client_name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Concepto</span>
              <span>{payment.concept}</span>
            </div>
            {payment.notes && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Notas</span>
                <span className="text-right max-w-[200px]">{payment.notes}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estado</span>
              <span className="capitalize">{payment.status}</span>
            </div>
          </div>

          <Separator className="my-4" />

          <p className="text-center text-3xl font-bold">${payment.amount.toFixed(2)}</p>
        </div>

        <Button onClick={handlePrint} className="no-print mt-4 w-full">
          <Printer className="mr-2 h-4 w-4" /> Imprimir / Descargar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
