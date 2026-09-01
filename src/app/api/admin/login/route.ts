import { NextResponse } from "next/server";

import { getAdminAuth } from "@/lib/auth-admin";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 6) {
    return NextResponse.json({ error: "Credenciales inválidas." }, { status: 400 });
  }

  const auth = await getAdminAuth();
  const { data, error } = await auth.auth.signInWithPassword({ email, password });
  if (error || data.user?.app_metadata.role !== "admin") {
    if (data.session) await auth.auth.signOut();
    return NextResponse.json({ error: "Credenciales inválidas." }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
