import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { FileText } from "lucide-react";

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
  payments: Payment[];
  showClient?: boolean;
  onViewReceipt: (payment: Payment) => void;
}

export function PaymentsList({ payments, showClient = false, onViewReceipt }: Props) {
  if (payments.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">No hay pagos registrados.</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            {showClient && <TableHead>Cliente</TableHead>}
            <TableHead>Concepto</TableHead>
            <TableHead>Notas</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-center">Recibo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map(p => (
            <TableRow key={p.id}>
              <TableCell className="whitespace-nowrap">
                {format(parseISO(p.payment_date), "dd/MM/yyyy", { locale: es })}
              </TableCell>
              {showClient && <TableCell>{p.client_name ?? "—"}</TableCell>}
              <TableCell>{p.concept}</TableCell>
              <TableCell className="max-w-[200px] truncate text-muted-foreground">{p.notes || "—"}</TableCell>
              <TableCell className="text-right font-medium">${p.amount.toFixed(2)}</TableCell>
              <TableCell>
                <Badge variant={p.status === "pagado" ? "default" : "secondary"}>{p.status}</Badge>
              </TableCell>
              <TableCell className="text-center">
                <Button size="icon" variant="ghost" onClick={() => onViewReceipt(p)}>
                  <FileText className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
