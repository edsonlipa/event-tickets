"use client";

import { useRouter } from "next/navigation";

export function LogoutAdmin() {
  const router = useRouter();
  return <button className="event-button-outline min-h-9 px-3 py-1 text-sm" onClick={async () => { await fetch("/api/admin/logout", { method: "POST" }); router.replace("/admin/login"); router.refresh(); }}>Salir</button>;
}
