import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PaymentCalendar } from "@/components/PaymentCalendar";
import { PaymentsList } from "@/components/PaymentsList";
import { ReceiptDialog } from "@/components/ReceiptDialog";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Plus, Users, CalendarDays, FileText, StickyNote, Send, UserPlus, MessageSquare, ImageIcon, CheckCircle, XCircle, Clock, CreditCard } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ClientProfile {
  user_id: string;
  full_name: string;
  username: string | null;
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

interface AdminNote {
  id: string;
  client_id: string;
  content: string;
  created_at: string;
}

interface ClientNote {
  id: string;
  user_id: string;
  note_date: string;
  content: string;
  created_at: string;
}

interface ReceiptUpload {
  id: string;
  user_id: string;
  file_url: string;
  file_name: string;
  description: string;
  created_at: string;
  status: string;
}

interface MetaAdsInvoice {
  id: string;
  user_id: string;
  invoice_date: string;
  amount: number;
  file_url: string | null;
  file_name: string;
  description: string;
  status: string;
  created_at: string;
}

const tabs = [
  { id: "register", label: "Pago", icon: Plus },
  { id: "calendar", label: "Calendario", icon: CalendarDays },
  { id: "meta-ads", label: "Meta Ads", icon: CreditCard },
  { id: "invoices", label: "Facturas", icon: FileText },
  { id: "receipts", label: "Comprobantes", icon: ImageIcon },
  { id: "notes", label: "Notas", icon: StickyNote },
  { id: "clients", label: "Clientes", icon: Users },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<TabId>("register");

  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const [formClientId, setFormClientId] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formConcept, setFormConcept] = useState("Suscripción mensual");
  const [formNotes, setFormNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [newClientName, setNewClientName] = useState("");
  const [newClientUsername, setNewClientUsername] = useState("");
  const [newClientPassword, setNewClientPassword] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);

  const [adminNotes, setAdminNotes] = useState<AdminNote[]>([]);
  const [noteClientId, setNoteClientId] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const [clientNotes, setClientNotes] = useState<ClientNote[]>([]);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<Date | null>(null);

  const [clientReceipts, setClientReceipts] = useState<ReceiptUpload[]>([]);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);

  const [metaInvoices, setMetaInvoices] = useState<MetaAdsInvoice[]>([]);

  const fetchData = async () => {
    const [clientsRes, paymentsRes, notesRes, clientNotesRes, receiptsRes, metaRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, username"),
      supabase.from("payments").select("*").order("payment_date", { ascending: false }),
      supabase.from("admin_client_notes").select("*").order("created_at", { ascending: false }),
      supabase.from("client_notes").select("*").order("created_at", { ascending: false }),
      supabase.from("payment_receipts").select("*").order("created_at", { ascending: false }),
      supabase.from("meta_ads_invoices").select("*").order("invoice_date", { ascending: false }),
    ]);
    setClients(clientsRes.data ?? []);
    setPayments(paymentsRes.data ?? []);
    setAdminNotes(notesRes.data ?? []);
    setClientNotes(clientNotesRes.data ?? []);
    setClientReceipts((receiptsRes.data as any[]) ?? []);
    setMetaInvoices((metaRes.data as any[]) ?? []);
  };

  useEffect(() => { fetchData(); }, []);

  const clientMap = Object.fromEntries(clients.map(c => [c.user_id, c.full_name]));
  const enrichedPayments = payments.map(p => ({ ...p, client_name: clientMap[p.client_id] || "Desconocido" }));
  const clientNoteDates = [...new Set(clientNotes.map(n => n.note_date))];
  const dayClientNotes = selectedCalendarDay ? clientNotes.filter(n => n.note_date === format(selectedCalendarDay, "yyyy-MM-dd")) : [];

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientId || !formAmount) return;
    setSubmitting(true);
    const { error } = await supabase.from("payments").insert({ client_id: formClientId, amount: parseFloat(formAmount), payment_date: formDate, concept: formConcept, notes: formNotes || null });
    setSubmitting(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Pago registrado y factura generada" }); setFormAmount(""); setFormNotes(""); fetchData(); }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newClientUsername.trim() || !newClientPassword.trim()) return;
    setCreatingClient(true);
    const res = await supabase.functions.invoke("create-client", { body: { name: newClientName.trim(), username: newClientUsername.toLowerCase().trim(), password: newClientPassword } });
    setCreatingClient(false);
    if (res.error || res.data?.error) { toast({ title: "Error al crear cliente", description: res.data?.error || res.error?.message || "Error desconocido", variant: "destructive" }); return; }
    toast({ title: "Cliente creado", description: `${newClientName} puede iniciar sesión con usuario: ${newClientUsername}` });
    setNewClientName(""); setNewClientUsername(""); setNewClientPassword(""); fetchData();
  };

  const handleSendNote = async () => {
    if (!noteClientId || !noteContent.trim()) return;
    setSavingNote(true);
    const { error } = await supabase.from("admin_client_notes").insert({ client_id: noteClientId, content: noteContent.trim() });
    setSavingNote(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Nota enviada al cliente" }); setNoteContent(""); fetchData(); }
  };

  const handleViewReceipt = (payment: any) => { setSelectedReceipt(payment); setReceiptOpen(true); };

  const handleUpdateReceiptStatus = async (receiptId: string, newStatus: string) => {
    const { error } = await supabase.from("payment_receipts").update({ status: newStatus }).eq("id", receiptId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: newStatus === "confirmado" ? "Comprobante confirmado" : "Comprobante rechazado" }); setClientReceipts(prev => prev.map(r => r.id === receiptId ? { ...r, status: newStatus } : r)); }
  };

  const handleUpdateMetaStatus = async (invoiceId: string, newStatus: string) => {
    const { error } = await supabase.from("meta_ads_invoices").update({ status: newStatus }).eq("id", invoiceId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: newStatus === "confirmado" ? "Factura Meta confirmada" : "Factura Meta rechazada" }); setMetaInvoices(prev => prev.map(i => i.id === invoiceId ? { ...i, status: newStatus } : i)); }
  };

  const handleCalendarDaySelect = (day: Date) => { setSelectedCalendarDay(day); };

  const inputClass = "rounded-xl bg-background/50 border-border/50 h-11";
  const labelClass = "text-xs font-bold uppercase tracking-wider text-muted-foreground";

  return (
    <div className="flex min-h-screen flex-col bg-background gradient-mesh">
      {/* Header */}
      <header className="glass-header sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-extrabold sm:text-xl tracking-tight">Pago LLC — Admin</h1>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={signOut} className="rounded-xl">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Salir</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Desktop tab bar */}
      {!isMobile && (
        <div className="glass-header !border-t-0 !border-b !shadow-none">
          <div className="mx-auto flex max-w-6xl gap-1 px-4 py-1.5 overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 whitespace-nowrap",
                  activeTab === t.id
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className={cn("mx-auto w-full max-w-6xl flex-1 p-4 space-y-4", isMobile && "pb-24")}>
        {activeTab === "register" && (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-5 pb-3"><h2 className="text-base sm:text-lg font-bold">Registrar nuevo pago</h2></div>
            <div className="px-5 pb-5">
              <form onSubmit={handleSubmitPayment} className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className={labelClass}>Cliente</Label>
                  <Select value={formClientId} onValueChange={setFormClientId}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                    <SelectContent className="glass-card rounded-xl border-0">{clients.map(c => (<SelectItem key={c.user_id} value={c.user_id}>{c.full_name || c.username || c.user_id.slice(0, 8)}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className={labelClass}>Monto ($)</Label>
                  <Input type="number" step="0.01" min="0" value={formAmount} onChange={e => setFormAmount(e.target.value)} required className={inputClass} />
                </div>
                <div className="space-y-2">
                  <Label className={labelClass}>Fecha</Label>
                  <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} required className={inputClass} />
                </div>
                <div className="space-y-2">
                  <Label className={labelClass}>Concepto</Label>
                  <Input value={formConcept} onChange={e => setFormConcept(e.target.value)} required className={inputClass} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className={labelClass}>Notas (opcional)</Label>
                  <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2} className="rounded-xl bg-background/50 border-border/50" />
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={submitting} className="w-full rounded-xl h-11 font-semibold">
                    <Plus className="mr-2 h-4 w-4" /> Registrar Pago
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === "calendar" && (
          <div className="space-y-4">
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="p-5 pb-3"><h2 className="text-base sm:text-lg font-bold">Calendario de Pagos</h2></div>
              <div className="px-5 pb-5">
                <PaymentCalendar payments={enrichedPayments} onDaySelect={handleCalendarDaySelect} noteDates={clientNoteDates} />
              </div>
            </div>
            {selectedCalendarDay && dayClientNotes.length > 0 && (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="p-5 pb-3">
                  <h2 className="flex items-center gap-2 text-base font-bold">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Notas de clientes — {format(selectedCalendarDay, "d 'de' MMMM yyyy", { locale: es })}
                  </h2>
                </div>
                <div className="px-5 pb-5 space-y-3">
                  {dayClientNotes.map(n => (
                    <div key={n.id} className="rounded-xl bg-background/50 border border-border/50 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="secondary" className="rounded-full font-semibold">{clientMap[n.user_id] || "Cliente"}</Badge>
                        <span className="text-xs text-muted-foreground font-medium">{new Date(n.created_at).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <p className="text-sm mt-1 font-medium">{n.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedCalendarDay && dayClientNotes.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-2 font-medium">Sin notas de clientes para este día.</p>
            )}
          </div>
        )}

        {activeTab === "meta-ads" && (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-5 pb-3"><h2 className="text-base sm:text-lg font-bold">Facturas Meta Ads de Clientes</h2></div>
            <div className="px-5 pb-5">
              {metaInvoices.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground font-medium">Ningún cliente ha subido facturas de Meta Ads aún.</p>
              ) : (
                <div className="space-y-3">
                  {metaInvoices.map(inv => (
                    <div key={inv.id} className="rounded-xl bg-background/50 border border-border/50 p-3 transition-all hover:shadow-md">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary" className="rounded-full font-semibold">{clientMap[inv.user_id] || "Cliente"}</Badge>
                        <Badge className="rounded-full text-[10px] font-bold" variant={inv.status === "confirmado" ? "default" : inv.status === "rechazado" ? "destructive" : "secondary"}>
                          {inv.status === "confirmado" && <CheckCircle className="h-3 w-3 mr-1" />}
                          {inv.status === "pendiente" && <Clock className="h-3 w-3 mr-1" />}
                          {inv.status === "rechazado" && <XCircle className="h-3 w-3 mr-1" />}
                          {inv.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-lg font-extrabold">${inv.amount.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground font-medium">{format(parseISO(inv.invoice_date), "d MMM yyyy", { locale: es })}</p>
                          {inv.description && <p className="text-sm text-muted-foreground truncate font-medium">{inv.description}</p>}
                          {inv.file_name && (
                            <a href={inv.file_url ?? "#"} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline font-semibold">📎 {inv.file_name}</a>
                          )}
                        </div>
                      </div>
                      {inv.status === "pendiente" && (
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" className="flex-1 rounded-xl font-semibold" onClick={() => handleUpdateMetaStatus(inv.id, "confirmado")}>
                            <CheckCircle className="mr-1 h-3.5 w-3.5" /> Confirmar
                          </Button>
                          <Button size="sm" variant="destructive" className="flex-1 rounded-xl font-semibold" onClick={() => handleUpdateMetaStatus(inv.id, "rechazado")}>
                            <XCircle className="mr-1 h-3.5 w-3.5" /> Rechazar
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "invoices" && (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-5 pb-3"><h2 className="text-base sm:text-lg font-bold">Todas las Facturas</h2></div>
            <div className="px-5 pb-5">
              <PaymentsList payments={enrichedPayments} showClient onViewReceipt={handleViewReceipt} />
            </div>
          </div>
        )}

        {activeTab === "receipts" && (
          <div className="space-y-4">
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="p-5 pb-3"><h2 className="text-base sm:text-lg font-bold">Comprobantes de Pago de Clientes</h2></div>
              <div className="px-5 pb-5">
                {clientReceipts.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground font-medium">Ningún cliente ha subido comprobantes aún.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {clientReceipts.map(r => (
                      <div key={r.id} className="rounded-xl bg-background/50 border border-border/50 overflow-hidden transition-all hover:shadow-md">
                        <button className="w-full" onClick={() => setReceiptPreviewUrl(receiptPreviewUrl === r.file_url ? null : r.file_url)}>
                          {r.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            <img src={r.file_url} alt={r.file_name} className="w-full h-40 object-cover" />
                          ) : (
                            <div className="w-full h-40 flex items-center justify-center bg-muted/30">
                              <FileText className="h-10 w-10 text-muted-foreground" />
                            </div>
                          )}
                        </button>
                        <div className="p-3">
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="secondary" className="rounded-full font-semibold">{clientMap[r.user_id] || "Cliente"}</Badge>
                            <Badge className="rounded-full text-[10px] font-bold" variant={r.status === "confirmado" ? "default" : r.status === "rechazado" ? "destructive" : "secondary"}>
                              {r.status === "confirmado" && <CheckCircle className="h-3 w-3 mr-1" />}
                              {r.status === "pendiente" && <Clock className="h-3 w-3 mr-1" />}
                              {r.status === "rechazado" && <XCircle className="h-3 w-3 mr-1" />}
                              {r.status}
                            </Badge>
                          </div>
                          <p className="text-sm font-semibold truncate">{r.file_name}</p>
                          {r.description && <p className="text-xs text-muted-foreground truncate font-medium">{r.description}</p>}
                          <span className="text-[11px] text-muted-foreground font-medium">{new Date(r.created_at).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}</span>
                          {r.status === "pendiente" && (
                            <div className="flex gap-2 mt-2">
                              <Button size="sm" className="flex-1 rounded-xl font-semibold" onClick={() => handleUpdateReceiptStatus(r.id, "confirmado")}>
                                <CheckCircle className="mr-1 h-3.5 w-3.5" /> Confirmar
                              </Button>
                              <Button size="sm" variant="destructive" className="flex-1 rounded-xl font-semibold" onClick={() => handleUpdateReceiptStatus(r.id, "rechazado")}>
                                <XCircle className="mr-1 h-3.5 w-3.5" /> Rechazar
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {receiptPreviewUrl && (
              <div className="glass-card rounded-2xl overflow-hidden p-2">
                {receiptPreviewUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img src={receiptPreviewUrl} alt="Preview" className="w-full rounded-xl" />
                ) : (
                  <iframe src={receiptPreviewUrl} className="w-full h-[500px] rounded-xl" title="PDF Preview" />
                )}
                <Button variant="outline" size="sm" className="mt-2 w-full rounded-xl glass" onClick={() => setReceiptPreviewUrl(null)}>Cerrar vista previa</Button>
              </div>
            )}
          </div>
        )}

        {activeTab === "notes" && (
          <div className="space-y-4">
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="p-5 pb-3"><h2 className="text-base sm:text-lg font-bold">Enviar nota de trabajo</h2></div>
              <div className="px-5 pb-5">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label className={labelClass}>Cliente</Label>
                    <Select value={noteClientId} onValueChange={setNoteClientId}>
                      <SelectTrigger className={inputClass}><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                      <SelectContent className="glass-card rounded-xl border-0">{clients.map(c => (<SelectItem key={c.user_id} value={c.user_id}>{c.full_name || c.username || c.user_id.slice(0, 8)}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}>Descripción del trabajo</Label>
                    <Textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Ej: Se realizó mantenimiento general..." rows={3} className="rounded-xl bg-background/50 border-border/50" />
                  </div>
                  <Button onClick={handleSendNote} disabled={savingNote || !noteClientId || !noteContent.trim()} className="w-full sm:w-auto rounded-xl h-11 font-semibold">
                    <Send className="mr-2 h-4 w-4" /> Enviar Nota
                  </Button>
                </div>
              </div>
            </div>

            {clientNotes.length > 0 && (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="p-5 pb-3">
                  <h2 className="flex items-center gap-2 text-base sm:text-lg font-bold">
                    <MessageSquare className="h-4 w-4 text-primary" /> Notas de Clientes
                  </h2>
                </div>
                <div className="px-5 pb-5 space-y-3">
                  {clientNotes.map(n => (
                    <div key={n.id} className="rounded-xl bg-background/50 border border-border/50 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="secondary" className="rounded-full font-semibold">{clientMap[n.user_id] || "Cliente"}</Badge>
                        <span className="text-xs text-muted-foreground font-medium">{n.note_date}</span>
                      </div>
                      <p className="text-sm font-medium">{n.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="p-5 pb-3"><h2 className="text-base sm:text-lg font-bold">Historial de Notas Enviadas</h2></div>
              <div className="px-5 pb-5">
                {adminNotes.length === 0 ? (
                  <p className="text-muted-foreground text-sm font-medium">No hay notas enviadas aún.</p>
                ) : (
                  <div className="space-y-3">
                    {adminNotes.map(n => (
                      <div key={n.id} className="rounded-xl bg-background/50 border border-border/50 p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm">{clientMap[n.client_id] || "Cliente"}</span>
                          <span className="text-xs text-muted-foreground font-medium">{new Date(n.created_at).toLocaleDateString("es")}</span>
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">{n.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "clients" && (
          <div className="space-y-4">
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="p-5 pb-3"><h2 className="text-base sm:text-lg font-bold">Crear nuevo cliente</h2></div>
              <div className="px-5 pb-5">
                <form onSubmit={handleCreateClient} className="grid gap-4">
                  <div className="space-y-2">
                    <Label className={labelClass}>Nombre completo</Label>
                    <Input value={newClientName} onChange={e => setNewClientName(e.target.value)} required className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}>Usuario (para login)</Label>
                    <Input value={newClientUsername} onChange={e => setNewClientUsername(e.target.value)} required className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass}>Contraseña</Label>
                    <Input type="password" minLength={6} value={newClientPassword} onChange={e => setNewClientPassword(e.target.value)} required className={inputClass} />
                  </div>
                  <Button type="submit" disabled={creatingClient} className="w-full rounded-xl h-11 font-semibold">
                    <UserPlus className="mr-2 h-4 w-4" /> Crear Cliente
                  </Button>
                </form>
              </div>
            </div>
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="p-5 pb-3"><h2 className="text-base sm:text-lg font-bold">Clientes Registrados</h2></div>
              <div className="px-5 pb-5">
                {clients.length === 0 ? (
                  <p className="text-muted-foreground text-sm font-medium">No hay clientes registrados aún.</p>
                ) : (
                  <div className="space-y-2">
                    {clients.map(c => (
                      <div key={c.user_id} className="flex items-center justify-between rounded-xl bg-background/50 border border-border/50 p-3 transition-all hover:shadow-md">
                        <div>
                          <span className="font-semibold text-sm">{c.full_name || "Sin nombre"}</span>
                          {c.username && <span className="ml-2 text-xs text-muted-foreground font-medium">@{c.username}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile bottom navigation */}
      {isMobile && (
        <nav className="fixed bottom-0 inset-x-0 z-40 glass-nav safe-area-bottom">
          <div className="flex items-center justify-around py-2">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-[10px] font-semibold transition-all min-w-[44px]",
                  activeTab === t.id ? "text-primary bg-primary/10" : "text-muted-foreground"
                )}
              >
                <t.icon className={cn("h-5 w-5", activeTab === t.id && "stroke-[2.5]")} />
                {t.label}
              </button>
            ))}
          </div>
        </nav>
      )}

      <ReceiptDialog payment={selectedReceipt} open={receiptOpen} onOpenChange={setReceiptOpen} />
    </div>
  );
}
