import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno obligatoria: ${name}`);
  return value;
}

export async function getAdminAuth() {
  const cookieStore = await cookies();
  return createServerClient(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options, httpOnly: true }),
            );
          } catch {
            // Los Server Components no pueden escribir cookies; proxy.ts refresca la sesión.
          }
        },
      },
    },
  );
}

export async function getAdminUser() {
  const auth = await getAdminAuth();
  const { data, error } = await auth.auth.getUser();
  if (error || data.user?.app_metadata.role !== "admin") return null;
  return data.user;
}
