import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Lock, User } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Auth() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await supabase.functions.invoke("login", {
        body: { username: username.trim(), password },
      });

      if (res.error || res.data?.error) {
        toast({ title: "Error al iniciar sesión", description: res.data?.error || "Usuario o contraseña incorrectos", variant: "destructive" });
        setLoading(false);
        return;
      }

      if (res.data?.session) {
        await supabase.auth.setSession({
          access_token: res.data.session.access_token,
          refresh_token: res.data.session.refresh_token,
        });
      }
    } catch {
      toast({ title: "Error al iniciar sesión", description: "Error de conexión", variant: "destructive" });
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background gradient-mesh px-4 relative overflow-hidden">
      {/* Floating orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-3xl animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-primary/5 blur-3xl" />

      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="glass-card rounded-2xl w-full max-w-md p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Pago LLC</h1>
          <p className="text-sm text-muted-foreground mt-1">Ingresa con tu usuario y contraseña</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Usuario</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                id="username" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                required 
                autoComplete="username" 
                className="pl-10 h-11 bg-background/50 border-border/50 focus:bg-background transition-colors"
                placeholder="Tu usuario"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                autoComplete="current-password" 
                className="pl-10 h-11 bg-background/50 border-border/50 focus:bg-background transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>
          <Button type="submit" className="w-full h-11 font-semibold text-sm rounded-xl" disabled={loading}>
            <LogIn className="mr-2 h-4 w-4" /> {loading ? "Entrando..." : "Iniciar Sesión"}
          </Button>
        </form>
      </div>
    </div>
  );
}
