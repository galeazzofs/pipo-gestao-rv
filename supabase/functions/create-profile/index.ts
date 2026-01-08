import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateProfileRequest {
  email: string;
  nome: string;
  nivel: "CN1" | "CN2" | "CN3";
}

const handler = async (req: Request): Promise<Response> => {
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

    // Use service role client for admin operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { email, nome, nivel }: CreateProfileRequest = await req.json();

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
  } catch (error: any) {
    console.error("Error in create-profile function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
