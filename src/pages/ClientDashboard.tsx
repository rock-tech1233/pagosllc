import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PaymentCalendar } from "@/components/PaymentCalendar";
import { PaymentsList } from "@/components/PaymentsList";
import { ReceiptDialog } from "@/components/ReceiptDialog";
import { useToast } from "@/hooks/use-toast";
import { LogOut, CalendarDays, List, Save } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export default function ClientDashboard() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

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
    ]).then(([paymentsRes, notesRes]) => {
      setPayments(paymentsRes.data ?? []);
      const notesMap: Record<string, { id: string; content: string }> = {};
      (notesRes.data ?? []).forEach((n: any) => {
        notesMap[n.note_date] = { id: n.id, content: n.content };
      });
      setNotes(notesMap);
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
