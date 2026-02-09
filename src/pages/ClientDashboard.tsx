import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaymentCalendar } from "@/components/PaymentCalendar";
import { ReceiptDialog } from "@/components/ReceiptDialog";
import { useToast } from "@/hooks/use-toast";
import { LogOut, CalendarDays, FileText, StickyNote, Save, Printer, Upload, ImageIcon, Trash2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AdminNote {
  id: string;
  content: string;
  created_at: string;
}

interface ReceiptUpload {
  id: string;
  file_url: string;
  file_name: string;
  description: string;
  created_at: string;
}

const tabs = [
  { id: "invoices", label: "Facturas", icon: FileText },
  { id: "work", label: "Trabajos", icon: StickyNote },
  { id: "receipts", label: "Comprobantes", icon: Upload },
  { id: "calendar", label: "Calendario", icon: CalendarDays },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function ClientDashboard() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<TabId>("invoices");

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

  // Receipt uploads
  const [uploads, setUploads] = useState<ReceiptUpload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadDesc, setUploadDesc] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("payments").select("*").eq("client_id", user.id).order("payment_date", { ascending: false }),
      supabase.from("client_notes").select("*").eq("user_id", user.id),
      supabase.from("admin_client_notes").select("*").eq("client_id", user.id).order("created_at", { ascending: false }),
      supabase.from("payment_receipts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]).then(([paymentsRes, notesRes, adminNotesRes, uploadsRes]) => {
      setPayments(paymentsRes.data ?? []);
      const notesMap: Record<string, { id: string; content: string }> = {};
      (notesRes.data ?? []).forEach((n: any) => {
        notesMap[n.note_date] = { id: n.id, content: n.content };
      });
      setNotes(notesMap);
      setAdminNotes(adminNotesRes.data ?? []);
      setUploads((uploadsRes.data as any[]) ?? []);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({ title: "Archivo muy grande", description: "El máximo es 5MB", variant: "destructive" });
      return;
    }

    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast({ title: "Tipo no permitido", description: "Solo imágenes o PDF", variant: "destructive" });
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("payment-receipts")
      .upload(filePath, file);

    if (uploadError) {
      toast({ title: "Error al subir", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("payment-receipts").getPublicUrl(filePath);

    const { data: row, error: insertError } = await supabase.from("payment_receipts").insert({
      user_id: user.id,
      file_url: urlData.publicUrl,
      file_name: file.name,
      description: uploadDesc.trim(),
    }).select().single();

    setUploading(false);
    if (insertError) {
      toast({ title: "Error", description: insertError.message, variant: "destructive" });
    } else {
      toast({ title: "Comprobante subido correctamente" });
      setUploads(prev => [row as any, ...prev]);
      setUploadDesc("");
      e.target.value = "";
    }
  };

  const handleDeleteUpload = async (upload: ReceiptUpload) => {
    // Extract path from URL
    const urlParts = upload.file_url.split("/payment-receipts/");
    const storagePath = urlParts[1];
    if (storagePath) {
      await supabase.storage.from("payment-receipts").remove([storagePath]);
    }
    await supabase.from("payment_receipts").delete().eq("id", upload.id);
    setUploads(prev => prev.filter(u => u.id !== upload.id));
    toast({ title: "Comprobante eliminado" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card sticky top-0 z-30">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold sm:text-xl">Pago LLC</h1>
            {profile?.full_name && (
              <p className="text-xs text-muted-foreground truncate sm:text-sm">Hola, {profile.full_name}</p>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Salir</span>
            </Button>
          </div>
        </div>
      </header>

      {!isMobile && (
        <div className="border-b bg-card">
          <div className="mx-auto flex max-w-4xl gap-1 px-4 py-1">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  activeTab === t.id
                    ? "bg-primary text-primary-foreground"
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

      <main className={cn("mx-auto w-full max-w-4xl flex-1 p-4 space-y-4", isMobile && "pb-20")}>
        {activeTab === "invoices" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Mis Facturas</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No tienes facturas aún.</p>
              ) : (
                <div className="space-y-4">
                  {payments.map(p => (
                    <div key={p.id} className="rounded-lg border p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono text-muted-foreground">{p.receipt_number}</span>
                        <Badge variant="default">Pagado</Badge>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 text-sm">
                          <span className="text-muted-foreground">Fecha: </span>
                          <span className="font-medium">{format(parseISO(p.payment_date), "d MMM yyyy", { locale: es })}</span>
                        </div>
                        <span className="text-xl font-bold sm:text-2xl whitespace-nowrap">${p.amount.toFixed(2)}</span>
                      </div>
                      <p className="text-sm mt-1 truncate"><span className="text-muted-foreground">Concepto: </span>{p.concept}</p>
                      {p.notes && <p className="text-xs text-muted-foreground mt-1 truncate">Nota: {p.notes}</p>}
                      <Separator className="my-3" />
                      <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => handleViewReceipt({ ...p, client_name: profile?.full_name })}>
                        <Printer className="mr-2 h-4 w-4" /> Ver Factura
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "work" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Trabajos Realizados</CardTitle>
            </CardHeader>
            <CardContent>
              {adminNotes.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No hay registros de trabajos aún.</p>
              ) : (
                <div className="space-y-3">
                  {adminNotes.map(n => (
                    <div key={n.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary">Trabajo realizado</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(n.created_at).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      <p className="text-sm">{n.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "receipts" && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Subir Comprobante de Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Descripción (opcional)</Label>
                    <Input
                      value={uploadDesc}
                      onChange={e => setUploadDesc(e.target.value)}
                      placeholder="Ej: Pago de enero, transferencia..."
                    />
                  </div>
                  <div>
                    <Label className="cursor-pointer">
                      <div className={cn(
                        "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
                        "hover:border-primary/50 hover:bg-accent/50",
                        uploading && "opacity-50 pointer-events-none"
                      )}>
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">
                          {uploading ? "Subiendo..." : "Toca para seleccionar archivo"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Imagen o PDF (máx. 5MB)</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Mis Comprobantes</CardTitle>
              </CardHeader>
              <CardContent>
                {uploads.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No has subido comprobantes aún.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {uploads.map(u => (
                      <div key={u.id} className="rounded-lg border overflow-hidden">
                        <button
                          className="w-full"
                          onClick={() => setPreviewUrl(previewUrl === u.file_url ? null : u.file_url)}
                        >
                          {u.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            <img
                              src={u.file_url}
                              alt={u.file_name}
                              className="w-full h-40 object-cover"
                            />
                          ) : (
                            <div className="w-full h-40 flex items-center justify-center bg-muted">
                              <FileText className="h-10 w-10 text-muted-foreground" />
                            </div>
                          )}
                        </button>
                        <div className="p-3">
                          <p className="text-sm font-medium truncate">{u.file_name}</p>
                          {u.description && <p className="text-xs text-muted-foreground truncate">{u.description}</p>}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(u.created_at).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive" onClick={() => handleDeleteUpload(u)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Full preview */}
            {previewUrl && (
              <Card>
                <CardContent className="p-2">
                  {previewUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img src={previewUrl} alt="Preview" className="w-full rounded-md" />
                  ) : (
                    <iframe src={previewUrl} className="w-full h-[500px] rounded-md" title="PDF Preview" />
                  )}
                  <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => setPreviewUrl(null)}>
                    Cerrar vista previa
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "calendar" && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Mi Calendario</CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentCalendar payments={enrichedPayments} onDaySelect={handleDaySelect} noteDates={Object.keys(notes)} />
              </CardContent>
            </Card>
            {selectedDay && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Mi nota — {format(selectedDay, "d 'de' MMMM yyyy", { locale: es })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Escribe una nota para este día..."
                    value={noteContent}
                    onChange={e => setNoteContent(e.target.value)}
                    rows={3}
                  />
                  <Button size="sm" className="mt-3 w-full sm:w-auto" onClick={handleSaveNote} disabled={savingNote}>
                    <Save className="mr-2 h-4 w-4" /> Guardar nota
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      {isMobile && (
        <nav className="fixed bottom-0 inset-x-0 z-40 border-t bg-card/95 backdrop-blur-sm">
          <div className="flex items-center justify-around py-1.5">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1 rounded-md text-[10px] font-medium transition-colors min-w-[52px]",
                  activeTab === t.id ? "text-primary" : "text-muted-foreground"
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
