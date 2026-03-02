import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaymentCalendar } from "@/components/PaymentCalendar";
import { ReceiptDialog } from "@/components/ReceiptDialog";
import { useToast } from "@/hooks/use-toast";
import { LogOut, CalendarDays, FileText, StickyNote, Save, Printer, Upload, Trash2, CreditCard, CheckCircle, Clock } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AdminNote { id: string; content: string; created_at: string; }
interface ReceiptUpload { id: string; file_url: string; file_name: string; description: string; created_at: string; status: string; }
interface MetaAdsInvoice { id: string; invoice_date: string; amount: number; file_url: string | null; file_name: string; description: string; status: string; created_at: string; }

const tabs = [
  { id: "calendar", label: "Calendario", icon: CalendarDays },
  { id: "meta", label: "Meta Ads", icon: CreditCard },
  { id: "invoices", label: "Facturas", icon: FileText },
  { id: "work", label: "Trabajos", icon: StickyNote },
  { id: "receipts", label: "Comprobantes", icon: Upload },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function ClientDashboard() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<TabId>("calendar");

  const [payments, setPayments] = useState<any[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState<AdminNote[]>([]);

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [noteId, setNoteId] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const [notes, setNotes] = useState<Record<string, { id: string; content: string }>>({});

  const [uploads, setUploads] = useState<ReceiptUpload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadDesc, setUploadDesc] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [metaInvoices, setMetaInvoices] = useState<MetaAdsInvoice[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("payments").select("*").eq("client_id", user.id).order("payment_date", { ascending: false }),
      supabase.from("client_notes").select("*").eq("user_id", user.id),
      supabase.from("admin_client_notes").select("*").eq("client_id", user.id).order("created_at", { ascending: false }),
      supabase.from("payment_receipts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("meta_ads_invoices").select("*").eq("user_id", user.id).order("invoice_date", { ascending: false }),
    ]).then(([paymentsRes, notesRes, adminNotesRes, uploadsRes, metaRes]) => {
      setPayments(paymentsRes.data ?? []);
      const notesMap: Record<string, { id: string; content: string }> = {};
      (notesRes.data ?? []).forEach((n: any) => { notesMap[n.note_date] = { id: n.id, content: n.content }; });
      setNotes(notesMap);
      setAdminNotes(adminNotesRes.data ?? []);
      setUploads((uploadsRes.data as any[]) ?? []);
      setMetaInvoices((metaRes.data as any[]) ?? []);
    });
  }, [user]);

  const enrichedPayments = payments.map(p => ({ ...p, client_name: profile?.full_name ?? "" }));
  const metaInvoiceDates = [...new Set(metaInvoices.map(i => i.invoice_date))];

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
      const { data } = await supabase.from("client_notes").insert({ user_id: user.id, note_date: key, content: noteContent.trim() }).select("id").single();
      if (data) { setNoteId(data.id); setNotes(prev => ({ ...prev, [key]: { id: data.id, content: noteContent.trim() } })); }
    }
    setSavingNote(false);
    toast({ title: "Nota guardada" });
  };

  const handleViewReceipt = (payment: any) => { setSelectedReceipt(payment); setReceiptOpen(true); };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: "Archivo muy grande", description: "Máx 5MB", variant: "destructive" }); return; }
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") { toast({ title: "Tipo no permitido", variant: "destructive" }); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("payment-receipts").upload(filePath, file);
    if (uploadError) { toast({ title: "Error", description: uploadError.message, variant: "destructive" }); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("payment-receipts").getPublicUrl(filePath);
    const { data: row, error } = await supabase.from("payment_receipts").insert({ user_id: user.id, file_url: urlData.publicUrl, file_name: file.name, description: uploadDesc.trim() }).select().single();
    setUploading(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Comprobante subido" }); setUploads(prev => [row as any, ...prev]); setUploadDesc(""); e.target.value = ""; }
  };

  const handleDeleteUpload = async (upload: ReceiptUpload) => {
    const urlParts = upload.file_url.split("/payment-receipts/");
    if (urlParts[1]) await supabase.storage.from("payment-receipts").remove([urlParts[1]]);
    await supabase.from("payment_receipts").delete().eq("id", upload.id);
    setUploads(prev => prev.filter(u => u.id !== upload.id));
    toast({ title: "Comprobante eliminado" });
  };

  // Day meta invoices for calendar view
  const dayMetaInvoices = selectedDay ? metaInvoices.filter(i => i.invoice_date === format(selectedDay, "yyyy-MM-dd")) : [];

  return (
    <div className="flex min-h-screen flex-col bg-background gradient-mesh">
      <header className="glass-header sticky top-0 z-30">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold sm:text-xl tracking-tight">Pago LLC</h1>
            {profile?.full_name && <p className="text-xs text-muted-foreground truncate sm:text-sm font-medium">Hola, {profile.full_name}</p>}
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={signOut} className="rounded-xl"><LogOut className="h-4 w-4" /><span className="hidden sm:inline ml-2">Salir</span></Button>
          </div>
        </div>
      </header>

      {!isMobile && (
        <div className="glass-header !border-t-0 !border-b !shadow-none">
          <div className="mx-auto flex max-w-4xl gap-1 px-4 py-1.5">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className={cn("flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200", activeTab === t.id ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                <t.icon className="h-4 w-4" />{t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <main className={cn("mx-auto w-full max-w-4xl flex-1 p-4 space-y-4", isMobile && "pb-24")}>
        {/* Meta Ads - read-only view */}
        {activeTab === "meta" && (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-5 pb-3"><h2 className="text-base sm:text-lg font-bold">Mis Facturas Meta Ads</h2></div>
            <div className="px-5 pb-5">
              {metaInvoices.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground font-medium">No tienes facturas de Meta Ads registradas aún.</p>
              ) : (
                <div className="space-y-3">
                  {metaInvoices.map(inv => (
                    <div key={inv.id} className="rounded-xl bg-background/50 border border-border/50 p-3 transition-all hover:shadow-md">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground font-medium">{format(parseISO(inv.invoice_date), "d MMM yyyy", { locale: es })}</span>
                        <Badge className="rounded-full text-[10px] font-bold" variant={inv.status === "confirmado" ? "default" : inv.status === "rechazado" ? "destructive" : "secondary"}>
                          {inv.status === "confirmado" && <CheckCircle className="h-3 w-3 mr-1" />}
                          {inv.status === "pendiente" && <Clock className="h-3 w-3 mr-1" />}
                          {inv.status}
                        </Badge>
                      </div>
                      <p className="text-lg font-extrabold">${inv.amount.toFixed(2)}</p>
                      {inv.description && <p className="text-sm text-muted-foreground truncate font-medium">{inv.description}</p>}
                      {inv.file_name && inv.file_url && (
                        <a href={inv.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline font-semibold">📎 {inv.file_name}</a>
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
            <div className="p-5 pb-3"><h2 className="text-base sm:text-lg font-bold">Mis Facturas</h2></div>
            <div className="px-5 pb-5">
              {payments.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground font-medium">No tienes facturas aún.</p>
              ) : (
                <div className="space-y-3">
                  {payments.map(p => (
                    <div key={p.id} className="rounded-xl bg-background/50 border border-border/50 p-3 sm:p-4 transition-all hover:shadow-md">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono text-muted-foreground">{p.receipt_number}</span>
                        <Badge className="rounded-full font-semibold">Pagado</Badge>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 text-sm"><span className="text-muted-foreground">Fecha: </span><span className="font-semibold">{format(parseISO(p.payment_date), "d MMM yyyy", { locale: es })}</span></div>
                        <span className="text-xl font-extrabold sm:text-2xl whitespace-nowrap">${p.amount.toFixed(2)}</span>
                      </div>
                      <p className="text-sm mt-1 truncate"><span className="text-muted-foreground">Concepto: </span>{p.concept}</p>
                      {p.notes && <p className="text-xs text-muted-foreground mt-1 truncate">Nota: {p.notes}</p>}
                      <Separator className="my-3 bg-border/30" />
                      <Button size="sm" variant="outline" className="w-full sm:w-auto rounded-xl glass" onClick={() => handleViewReceipt({ ...p, client_name: profile?.full_name })}>
                        <Printer className="mr-2 h-4 w-4" /> Ver Factura
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "work" && (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-5 pb-3"><h2 className="text-base sm:text-lg font-bold">Trabajos Realizados</h2></div>
            <div className="px-5 pb-5">
              {adminNotes.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground font-medium">No hay registros de trabajos aún.</p>
              ) : (
                <div className="space-y-3">
                  {adminNotes.map(n => (
                    <div key={n.id} className="rounded-xl bg-background/50 border border-border/50 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary" className="rounded-full font-semibold">Trabajo realizado</Badge>
                        <span className="text-xs text-muted-foreground font-medium">{new Date(n.created_at).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>
                      <p className="text-sm font-medium">{n.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "receipts" && (
          <div className="space-y-4">
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="p-5 pb-3"><h2 className="text-base sm:text-lg font-bold">Subir Comprobante de Pago</h2></div>
              <div className="px-5 pb-5">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descripción (opcional)</Label>
                    <Input value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} placeholder="Ej: Pago de enero..." className="rounded-xl bg-background/50 border-border/50 h-11" />
                  </div>
                  <Label className="cursor-pointer">
                    <div className={cn("flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-all hover:border-primary/50 hover:bg-accent/30", uploading && "opacity-50 pointer-events-none")}>
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3"><Upload className="h-6 w-6 text-primary" /></div>
                      <p className="text-sm font-semibold">{uploading ? "Subiendo..." : "Seleccionar archivo"}</p>
                      <p className="text-xs text-muted-foreground mt-1 font-medium">Imagen o PDF (máx. 5MB)</p>
                    </div>
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  </Label>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="p-5 pb-3"><h2 className="text-base sm:text-lg font-bold">Mis Comprobantes</h2></div>
              <div className="px-5 pb-5">
                {uploads.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground font-medium">No has subido comprobantes aún.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {uploads.map(u => (
                      <div key={u.id} className="rounded-xl bg-background/50 border border-border/50 overflow-hidden transition-all hover:shadow-md">
                        <button className="w-full" onClick={() => setPreviewUrl(previewUrl === u.file_url ? null : u.file_url)}>
                          {u.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? <img src={u.file_url} alt={u.file_name} className="w-full h-40 object-cover" /> : <div className="w-full h-40 flex items-center justify-center bg-muted/30"><FileText className="h-10 w-10 text-muted-foreground" /></div>}
                        </button>
                        <div className="p-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold truncate">{u.file_name}</p>
                            <Badge className="rounded-full text-[10px] font-bold" variant={u.status === "confirmado" ? "default" : u.status === "rechazado" ? "destructive" : "secondary"}>
                              {u.status === "confirmado" && <CheckCircle className="h-3 w-3 mr-1" />}{u.status === "pendiente" && <Clock className="h-3 w-3 mr-1" />}{u.status}
                            </Badge>
                          </div>
                          {u.description && <p className="text-xs text-muted-foreground truncate font-medium">{u.description}</p>}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[11px] text-muted-foreground font-medium">{new Date(u.created_at).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}</span>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive rounded-lg" onClick={() => handleDeleteUpload(u)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {previewUrl && (
              <div className="glass-card rounded-2xl overflow-hidden p-2">
                {previewUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? <img src={previewUrl} alt="Preview" className="w-full rounded-xl" /> : <iframe src={previewUrl} className="w-full h-[500px] rounded-xl" title="PDF" />}
                <Button variant="outline" size="sm" className="mt-2 w-full rounded-xl glass" onClick={() => setPreviewUrl(null)}>Cerrar</Button>
              </div>
            )}
          </div>
        )}

        {activeTab === "calendar" && (
          <div className="space-y-4">
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="p-5 pb-3"><h2 className="text-base sm:text-lg font-bold">Mi Calendario</h2></div>
              <div className="px-5 pb-5">
                <PaymentCalendar payments={enrichedPayments} onDaySelect={handleDaySelect} noteDates={[...Object.keys(notes), ...metaInvoiceDates]} />
              </div>
            </div>

            {selectedDay && (
              <>
                {/* Show meta invoices for this day (read-only) */}
                {dayMetaInvoices.length > 0 && (
                  <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="p-5 pb-3">
                      <h2 className="text-base font-bold flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-primary" />
                        Meta Ads — {format(selectedDay, "d 'de' MMMM yyyy", { locale: es })}
                      </h2>
                    </div>
                    <div className="px-5 pb-5 space-y-2">
                      {dayMetaInvoices.map(inv => (
                        <div key={inv.id} className="flex items-center justify-between rounded-xl bg-background/50 border border-border/50 p-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold">${inv.amount.toFixed(2)}</p>
                            {inv.description && <p className="text-xs text-muted-foreground truncate font-medium">{inv.description}</p>}
                          </div>
                          <Badge className="rounded-full text-[10px] font-bold" variant={inv.status === "confirmado" ? "default" : inv.status === "rechazado" ? "destructive" : "secondary"}>{inv.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="glass-card rounded-2xl overflow-hidden">
                  <div className="p-5 pb-3"><h2 className="text-base font-bold">Mi nota — {format(selectedDay, "d 'de' MMMM yyyy", { locale: es })}</h2></div>
                  <div className="px-5 pb-5">
                    <Textarea placeholder="Escribe una nota..." value={noteContent} onChange={e => setNoteContent(e.target.value)} rows={3} className="rounded-xl bg-background/50 border-border/50" />
                    <Button size="sm" className="mt-3 w-full sm:w-auto rounded-xl font-semibold" onClick={handleSaveNote} disabled={savingNote}><Save className="mr-2 h-4 w-4" /> Guardar nota</Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {isMobile && (
        <nav className="fixed bottom-0 inset-x-0 z-40 glass-nav safe-area-bottom">
          <div className="flex items-center justify-around py-2">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className={cn("flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-all min-w-[50px]", activeTab === t.id ? "text-primary bg-primary/10" : "text-muted-foreground")}>
                <t.icon className={cn("h-5 w-5", activeTab === t.id && "stroke-[2.5]")} />{t.label}
              </button>
            ))}
          </div>
        </nav>
      )}

      <ReceiptDialog payment={selectedReceipt} open={receiptOpen} onOpenChange={setReceiptOpen} />
    </div>
  );
}
