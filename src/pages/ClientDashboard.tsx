import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PaymentCalendar } from "@/components/PaymentCalendar";
import { ReceiptDialog } from "@/components/ReceiptDialog";
import { useToast } from "@/hooks/use-toast";
import { LogOut, CalendarDays, FileText, StickyNote, Save, Printer } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface AdminNote {
  id: string;
  content: string;
  created_at: string;
}

export default function ClientDashboard() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState<AdminNote[]>([]);

  // Client notes
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [noteId, setNoteId] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const [notes, setNotes] = useState<Record<string, { id: string; content: string }>>({});

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("payments").select("*").eq("client_id", user.id).order("payment_date", { ascending: false }),
      supabase.from("client_notes").select("*").eq("user_id", user.id),
      supabase.from("admin_client_notes").select("*").eq("client_id", user.id).order("created_at", { ascending: false }),
    ]).then(([paymentsRes, notesRes, adminNotesRes]) => {
      setPayments(paymentsRes.data ?? []);
      const notesMap: Record<string, { id: string; content: string }> = {};
      (notesRes.data ?? []).forEach((n: any) => {
        notesMap[n.note_date] = { id: n.id, content: n.content };
      });
      setNotes(notesMap);
      setAdminNotes(adminNotesRes.data ?? []);
    });
  }, [user]);

  const enrichedPayments = payments.map(p => ({ ...p, client_name: profile?.full_name ?? "" }));

  const handleDaySelect = (day: Date) => {
    setSelectedDay(day);
    const key = format(day, "yyyy-MM-dd");
    const existing = notes[key];
    setNoteContent(existing?.content ?? "");
    setNoteId(existing?.id ?? null);
  };

  const handleSaveNote = async () => {
    if (!user || !selectedDay) return;
    setSavingNote(true);
    const key = format(selectedDay, "yyyy-MM-dd");

    if (noteId) {
      if (noteContent.trim()) {
        await supabase.from("client_notes").update({ content: noteContent.trim() }).eq("id", noteId);
        setNotes(prev => ({ ...prev, [key]: { id: noteId, content: noteContent.trim() } }));
      } else {
        await supabase.from("client_notes").delete().eq("id", noteId);
        setNotes(prev => { const n = { ...prev }; delete n[key]; return n; });
        setNoteId(null);
      }
    } else if (noteContent.trim()) {
      const { data } = await supabase.from("client_notes").insert({
        user_id: user.id,
        note_date: key,
        content: noteContent.trim(),
      }).select("id").single();
      if (data) {
        setNoteId(data.id);
        setNotes(prev => ({ ...prev, [key]: { id: data.id, content: noteContent.trim() } }));
      }
    }

    setSavingNote(false);
    toast({ title: "Nota guardada" });
  };

  const handleViewReceipt = (payment: any) => {
    setSelectedReceipt(payment);
    setReceiptOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-xl font-bold">Pago LLC</h1>
            {profile?.full_name && <p className="text-sm text-muted-foreground">Hola, {profile.full_name}</p>}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" /> Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 p-4">
        <Tabs defaultValue="invoices">
          <TabsList className="flex-wrap">
            <TabsTrigger value="invoices"><FileText className="mr-1 h-4 w-4" /> Mis Facturas</TabsTrigger>
            <TabsTrigger value="work"><StickyNote className="mr-1 h-4 w-4" /> Trabajos Realizados</TabsTrigger>
            <TabsTrigger value="calendar"><CalendarDays className="mr-1 h-4 w-4" /> Mi Calendario</TabsTrigger>
          </TabsList>

          {/* FACTURAS - permanentes, no se pueden borrar */}
          <TabsContent value="invoices">
            <Card>
              <CardHeader><CardTitle>Mis Facturas</CardTitle></CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">No tienes facturas aún.</p>
                ) : (
                  <div className="space-y-4">
                    {payments.map(p => (
                      <div key={p.id} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono text-muted-foreground">{p.receipt_number}</span>
                          <Badge variant="default">Pagado</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Fecha: </span>
                            <span className="font-medium">{format(parseISO(p.payment_date), "d 'de' MMMM yyyy", { locale: es })}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-bold">${p.amount.toFixed(2)}</span>
                          </div>
                        </div>
                        <p className="text-sm mt-1"><span className="text-muted-foreground">Concepto: </span>{p.concept}</p>
                        {p.notes && <p className="text-sm text-muted-foreground mt-1">Nota: {p.notes}</p>}
                        <Separator className="my-3" />
                        <Button size="sm" variant="outline" onClick={() => handleViewReceipt({ ...p, client_name: profile?.full_name })}>
                          <Printer className="mr-2 h-4 w-4" /> Ver / Imprimir Factura
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TRABAJOS REALIZADOS - notas del admin */}
          <TabsContent value="work">
            <Card>
              <CardHeader><CardTitle>Trabajos Realizados</CardTitle></CardHeader>
              <CardContent>
                {adminNotes.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">No hay registros de trabajos aún.</p>
                ) : (
                  <div className="space-y-3">
                    {adminNotes.map(n => (
                      <div key={n.id} className="rounded-md border p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="secondary">Trabajo realizado</Badge>
                          <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" })}</span>
                        </div>
                        <p className="text-sm">{n.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CALENDARIO con notas personales del cliente */}
          <TabsContent value="calendar">
            <Card>
              <CardHeader><CardTitle>Mi Calendario</CardTitle></CardHeader>
              <CardContent>
                <PaymentCalendar payments={enrichedPayments} onDaySelect={handleDaySelect} noteDates={Object.keys(notes)} />
                {selectedDay && (
                  <div className="mt-4 space-y-2 border-t pt-4">
                    <p className="text-sm font-medium">
                      Mi nota — {format(selectedDay, "d 'de' MMMM yyyy", { locale: es })}
                    </p>
                    <Textarea
                      placeholder="Escribe una nota para este día..."
                      value={noteContent}
                      onChange={e => setNoteContent(e.target.value)}
                      rows={3}
                    />
                    <Button size="sm" onClick={handleSaveNote} disabled={savingNote}>
                      <Save className="mr-2 h-4 w-4" /> Guardar nota
                    </Button>
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
