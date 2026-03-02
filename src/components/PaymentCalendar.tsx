import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  concept: string;
  client_name?: string;
}

interface Props {
  payments: Payment[];
  onDaySelect?: (date: Date) => void;
  noteDates?: string[];
}

export function PaymentCalendar({ payments, onDaySelect, noteDates = [] }: Props) {
  const [selectedDay, setSelectedDay] = useState<Date | undefined>();

  const paymentDates = payments.map(p => parseISO(p.payment_date));
  const noteDatesParsed = noteDates.map(d => parseISO(d));

  const handleSelect = (day: Date | undefined) => {
    setSelectedDay(day);
    if (day && onDaySelect) onDaySelect(day);
  };

  const modifiers = { payment: paymentDates, note: noteDatesParsed };
  const modifiersStyles = {
    payment: {
      backgroundColor: "hsl(var(--primary) / 0.15)",
      borderRadius: "12px",
      fontWeight: "bold" as const,
    },
    note: {
      border: "2px solid hsl(var(--primary) / 0.3)",
      borderRadius: "12px",
    },
  };

  const dayPayments = selectedDay
    ? payments.filter(p => isSameDay(parseISO(p.payment_date), selectedDay))
    : [];

  return (
    <div className="space-y-4">
      <Calendar
        mode="single"
        selected={selectedDay}
        onSelect={handleSelect}
        locale={es}
        modifiers={modifiers}
        modifiersStyles={modifiersStyles}
        className="rounded-xl border border-border/50 mx-auto bg-background/30"
      />
      {selectedDay && dayPayments.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-muted-foreground">
            Pagos del {format(selectedDay, "d 'de' MMMM yyyy", { locale: es })}:
          </p>
          {dayPayments.map(p => (
            <div key={p.id} className="flex items-center justify-between rounded-xl bg-background/50 border border-border/50 p-3 transition-all hover:shadow-md">
              <div>
                <p className="text-sm font-semibold">{p.concept}</p>
                {p.client_name && <p className="text-xs text-muted-foreground font-medium">{p.client_name}</p>}
              </div>
              <Badge className="rounded-full font-bold">${p.amount.toFixed(2)}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
