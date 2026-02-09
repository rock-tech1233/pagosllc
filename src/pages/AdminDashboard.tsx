import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentCalendar } from "@/components/PaymentCalendar";
import { PaymentsList } from "@/components/PaymentsList";
import { ReceiptDialog } from "@/components/ReceiptDialog";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Plus, Users, CalendarDays, List } from "lucide-react";

interface ClientProfile {
  user_id: string;
  full_name: string;
}

interface PaymentRow {
  id: string;
  amount: number;
  payment_date: string;
  concept: string;
  notes: string | null;
  receipt_number: string;
  status: string;
  client_id: string;
}

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const { toast } = useToast();

  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  // Form state
  const [formClientId, setFormClientId] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formConcept, setFormConcept] = useState("Suscripción mensual");
  const [formNotes, setFormNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    const [clientsRes, paymentsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name"),
      supabase.from("payments").select("*").order("payment_date", { ascending: false }),
    ]);
    setClients(clientsRes.data ?? []);
    setPayments(paymentsRes.data ?? []);
  };

  useEffect(() => { fetchData(); }, []);

  const clientMap = Object.fromEntries(clients.map(c => [c.user_id, c.full_name]));

  const enrichedPayments = payments.map(p => ({
    ...p,
    client_name: clientMap[p.client_id] || "Desconocido",
  }));

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientId || !formAmount) return;
    setSubmitting(true);

    const { error } = await supabase.from("payments").insert({
      client_id: formClientId,
      amount: parseFloat(formAmount),
      payment_date: formDate,
      concept: formConcept,
      notes: formNotes || null,
    });

    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Pago registrado" });
      setFormAmount("");
      setFormNotes("");
      fetchData();
    }
  };

  const handleViewReceipt = (payment: any) => {
    setSelectedReceipt(payment);
    setReceiptOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold">Panel de Administración</h1>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Salir
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-4">
        <Tabs defaultValue="register">
          <TabsList>
            <TabsTrigger value="register"><Plus className="mr-1 h-4 w-4" /> Registrar Pago</TabsTrigger>
            <TabsTrigger value="calendar"><CalendarDays className="mr-1 h-4 w-4" /> Calendario</TabsTrigger>
            <TabsTrigger value="list"><List className="mr-1 h-4 w-4" /> Historial</TabsTrigger>
            <TabsTrigger value="clients"><Users className="mr-1 h-4 w-4" /> Clientes</TabsTrigger>
          </TabsList>

          <TabsContent value="register">
            <Card>
              <CardHeader><CardTitle>Registrar nuevo pago</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitPayment} className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select value={formClientId} onValueChange={setFormClientId}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                      <SelectContent>
                        {clients.map(c => (
                          <SelectItem key={c.user_id} value={c.user_id}>
                            {c.full_name || c.user_id.slice(0, 8)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Monto ($)</Label>
                    <Input type="number" step="0.01" min="0" value={formAmount} onChange={e => setFormAmount(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha</Label>
                    <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Concepto</Label>
                    <Input value={formConcept} onChange={e => setFormConcept(e.target.value)} required />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Notas (opcional)</Label>
                    <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                      <Plus className="mr-2 h-4 w-4" /> Registrar Pago
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar">
            <Card>
              <CardHeader><CardTitle>Calendario de Pagos</CardTitle></CardHeader>
              <CardContent>
                <PaymentCalendar payments={enrichedPayments} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="list">
            <Card>
              <CardHeader><CardTitle>Historial de Pagos</CardTitle></CardHeader>
              <CardContent>
                <PaymentsList payments={enrichedPayments} showClient onViewReceipt={handleViewReceipt} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients">
            <Card>
              <CardHeader><CardTitle>Clientes Registrados</CardTitle></CardHeader>
              <CardContent>
                {clients.length === 0 ? (
                  <p className="text-muted-foreground">No hay clientes registrados aún.</p>
                ) : (
                  <div className="space-y-2">
                    {clients.map(c => (
                      <div key={c.user_id} className="flex items-center justify-between rounded-md border p-3">
                        <span className="font-medium">{c.full_name || "Sin nombre"}</span>
                        <span className="text-sm text-muted-foreground">{c.user_id.slice(0, 8)}...</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <ReceiptDialog payment={selectedReceipt} open={receiptOpen} onOpenChange={setReceiptOpen} />
    </div>
  );
}
