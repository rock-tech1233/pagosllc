import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type Role = "admin" | "client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: Role | null;
  profile: { full_name: string; phone: string | null } | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [profile, setProfile] = useState<{ full_name: string; phone: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    const [rolesRes, profileRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      supabase.from("profiles").select("full_name, phone").eq("user_id", userId).maybeSingle(),
    ]);
    setRole((rolesRes.data?.role as Role) ?? "client");
    setProfile(profileRes.data ?? null);
  };

  useEffect(() => {
    let mounted = true;

    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        await fetchUserData(newSession.user.id);
      } else {
        setRole(null);
        setProfile(null);
      }
      if (mounted) setLoading(false);
    });

    // THEN get initial session
    supabase.auth.getSession().then(async ({ data: { session: initSession } }) => {
      if (!mounted) return;
      setSession(initSession);
      setUser(initSession?.user ?? null);
      if (initSession?.user) {
        await fetchUserData(initSession.user.id);
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setProfile(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
