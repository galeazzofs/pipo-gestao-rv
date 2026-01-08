import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { email, nome } = await req.json();

    // Check if admin already exists
    const { data: existingRoles } = await adminClient
      .from("user_roles")
      .select("*")
      .eq("role", "admin");

    if (existingRoles && existingRoles.length > 0) {
      return new Response(
        JSON.stringify({ error: "Admin already exists" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user
    const { data: newUser, error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: true, // Auto-confirm for admin
      user_metadata: { nome, nivel: "admin" },
    });

    if (createUserError) {
      throw createUserError;
    }

    if (!newUser?.user) {
      throw new Error("Failed to create user");
    }

    // Create profile
    const { error: profileError } = await adminClient
      .from("profiles")
      .insert({
        id: newUser.user.id,
        email,
        nome,
        nivel: "CN1", // Default, admin doesn't use this
      });

    if (profileError) {
      console.error("Profile error:", profileError);
    }

    // Add admin role
    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({
        user_id: newUser.user.id,
        role: "admin",
      });

    if (roleError) {
      throw roleError;
    }

    // Generate magic link for login
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: newUser.user.id,
        message: "Admin created! Use the login page to access."
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
