import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return new Response(JSON.stringify({ error: "Usuario y contraseña requeridos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Look up the user's email by username
    const { data: profile } = await adminClient.from("profiles").select("user_id").eq("username", username.toLowerCase().trim()).maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Usuario o contraseña incorrectos" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get email from auth.users
    const { data: userData } = await adminClient.auth.admin.getUserById(profile.user_id);
    if (!userData?.user?.email) {
      return new Response(JSON.stringify({ error: "Usuario o contraseña incorrectos" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Sign in with email + password using anon client
    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: session, error } = await anonClient.auth.signInWithPassword({
      email: userData.user.email,
      password,
    });

    if (error) {
      return new Response(JSON.stringify({ error: "Usuario o contraseña incorrectos" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ session: session.session }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Error interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
