import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentCalendar } from "@/components/PaymentCalendar";
import { PaymentsList } from "@/components/PaymentsList";
import { ReceiptDialog } from "@/components/ReceiptDialog";
import { LogOut, CalendarDays, List } from "lucide-react";

export default function ClientDashboard() {
  const { user, profile, signOut } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("payments")
      .select("*")
      .eq("client_id", user.id)
      .order("payment_date", { ascending: false })
      .then(({ data }) => setPayments(data ?? []));
  }, [user]);

  const enrichedPayments = payments.map(p => ({ ...p, client_name: profile?.full_name ?? "" }));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-xl font-bold">Mis Pagos</h1>
            {profile?.full_name && <p className="text-sm text-muted-foreground">Hola, {profile.full_name}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Salir
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 p-4">
        <Tabs defaultValue="calendar">
          <TabsList>
            <TabsTrigger value="calendar"><CalendarDays className="mr-1 h-4 w-4" /> Mi Calendario</TabsTrigger>
            <TabsTrigger value="list"><List className="mr-1 h-4 w-4" /> Mi Historial</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <Card>
              <CardHeader><CardTitle>Mi Calendario de Pagos</CardTitle></CardHeader>
              <CardContent>
                <PaymentCalendar payments={enrichedPayments} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="list">
            <Card>
              <CardHeader><CardTitle>Mi Historial de Pagos</CardTitle></CardHeader>
              <CardContent>
                <PaymentsList payments={enrichedPayments} onViewReceipt={(p) => { setSelectedReceipt(p); setReceiptOpen(true); }} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <ReceiptDialog payment={selectedReceipt} open={receiptOpen} onOpenChange={setReceiptOpen} />
    </div>
  );
}
