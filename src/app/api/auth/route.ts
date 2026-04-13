import { createClient } from "@supabase/supabase-js";

// Admin client with service_role for creating confirmed users
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  const { action, username, password } = await request.json();
  const email = `${username.toLowerCase().replace(/[^a-z0-9]/g, "")}@momo.app`;

  if (action === "signup") {
    // Check if username is taken
    const { data: existing } = await adminClient.auth.admin.listUsers();
    const taken = existing?.users?.some(
      (u) => u.user_metadata?.username?.toLowerCase() === username.toLowerCase()
    );
    if (taken) {
      return Response.json({ error: "用户名已被注册" }, { status: 400 });
    }

    // Create auto-confirmed user via admin API
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    // Sign in to get session
    const { data: session, error: signInError } = await adminClient.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return Response.json({ error: signInError.message }, { status: 400 });
    }

    return Response.json({
      user: { id: data.user.id, username },
      session: session.session,
    });
  }

  if (action === "login") {
    const { data, error } = await adminClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return Response.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    return Response.json({
      user: { id: data.user.id, username: data.user.user_metadata?.username || username },
      session: data.session,
    });
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
}
