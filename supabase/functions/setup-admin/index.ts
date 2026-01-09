import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  "https://lovable.dev",
  "https://preview--bxqihukgmrzkclfinnfr.lovable.app",
  "https://bxqihukgmrzkclfinnfr.lovable.app",
];

const getCorsHeaders = (origin: string | null) => {
  const isAllowed = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.app') || origin.endsWith('.lovable.dev')
  );
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
};

// Input validation schema
const setupAdminSchema = z.object({
  email: z.string().email("Invalid email format").max(255, "Email too long"),
  nome: z.string().min(1, "Name is required").max(255, "Name too long"),
  setup_secret: z.string().min(1, "Setup secret is required"),
});

// Safe error message mapping - never expose raw errors
function getSafeErrorMessage(error: unknown): string {
  const message = (error as Error)?.message?.toLowerCase() || "";
  
  if (message.includes("duplicate") || message.includes("already exists") || message.includes("already been registered")) {
    return "User already exists";
  }
  if (message.includes("foreign key") || (error as { code?: string })?.code === "23503") {
    return "Invalid reference";
  }
  if (message.includes("violates") || (error as { code?: string })?.code?.startsWith("23")) {
    return "Data validation failed";
  }
  if (message.includes("auth") || message.includes("jwt")) {
    return "Authentication failed";
  }
  return "An error occurred while processing your request";
}

// Secret token for admin setup - must be set as environment variable
const SETUP_SECRET = Deno.env.get("ADMIN_SETUP_SECRET");

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate input
    const body = await req.json();
    const validationResult = setupAdminSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: validationResult.error.issues.map(i => i.message) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, nome, setup_secret } = validationResult.data;
    
    if (!SETUP_SECRET) {
      console.error("ADMIN_SETUP_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Admin setup is not configured. Contact system administrator." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (setup_secret !== SETUP_SECRET) {
      console.warn("Invalid setup secret attempt");
      return new Response(
        JSON.stringify({ error: "Invalid setup credentials" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

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
      email_confirm: true,
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
        nivel: "CN1",
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
    await adminClient.auth.admin.generateLink({
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
  } catch (error: unknown) {
    console.error("Error:", {
      message: (error as Error)?.message,
      code: (error as { code?: string })?.code,
      stack: (error as Error)?.stack,
    });
    return new Response(
      JSON.stringify({ error: getSafeErrorMessage(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
