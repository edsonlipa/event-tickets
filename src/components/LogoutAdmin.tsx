"use client";

import { useRouter } from "next/navigation";

export function LogoutAdmin() {
  const router = useRouter();
  return <button className="text-sm font-semibold text-slate-600" onClick={async () => { await fetch("/api/admin/logout", { method: "POST" }); router.replace("/admin/login"); router.refresh(); }}>Salir</button>;
}
