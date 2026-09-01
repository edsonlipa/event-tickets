import { NextResponse } from "next/server";

import { getAdminAuth, getAdminUser } from "@/lib/auth-admin";

export async function POST() {
  if (!(await getAdminUser())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const auth = await getAdminAuth();
  await auth.auth.signOut();
  return NextResponse.json({ ok: true });
}
