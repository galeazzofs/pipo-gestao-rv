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
const createProfileSchema = z.object({
  email: z.string().email("Invalid email format").max(255, "Email too long"),
  nome: z.string().min(1, "Name is required").max(255, "Name too long"),
  nivel: z.enum(["CN1", "CN2", "CN3"], { errorMap: () => ({ message: "Invalid nivel value" }) }),
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

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to check if they're admin
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user token
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await userClient.auth.getUser(token);

    if (claimsError || !claims?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claims.user.id;

    // Check if user is admin
    const { data: roleData, error: roleError } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate input
    const body = await req.json();
    const validationResult = createProfileSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: validationResult.error.issues.map(i => i.message) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, nome, nivel } = validationResult.data;

    // Use service role client for admin operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Create user via admin API
    const { data: newUser, error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: { nome, nivel },
    });

    if (createUserError) {
      // If user already exists, try to get their ID
      if (createUserError.message.includes("already been registered")) {
        // Get existing user
        const { data: listData } = await adminClient.auth.admin.listUsers();
        const existingUser = listData?.users?.find(u => u.email === email);
        
        if (existingUser) {
          // Create profile for existing user
          const { error: profileError } = await adminClient
            .from("profiles")
            .upsert({
              id: existingUser.id,
              email,
              nome,
              nivel,
            });

          if (profileError) {
            throw profileError;
          }

          // Add CN role
          await adminClient
            .from("user_roles")
            .upsert({
              user_id: existingUser.id,
              role: "cn",
            });

          // Send magic link
          await adminClient.auth.admin.generateLink({
            type: "magiclink",
            email,
          });

          return new Response(
            JSON.stringify({ success: true, message: "Profile updated for existing user" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
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
        nivel,
      });

    if (profileError) {
      throw profileError;
    }

    // Add CN role
    const { error: roleInsertError } = await adminClient
      .from("user_roles")
      .insert({
        user_id: newUser.user.id,
        role: "cn",
      });

    if (roleInsertError) {
      console.error("Error adding role:", roleInsertError);
    }

    // Send magic link invite
    const { error: inviteError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (inviteError) {
      console.error("Error generating invite link:", inviteError);
    }

    return new Response(
      JSON.stringify({ success: true, userId: newUser.user.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in create-profile function:", {
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
