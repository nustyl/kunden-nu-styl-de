import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export async function getCurrentProfile(): Promise<{
  user: { id: string; email: string | null };
  profile: Profile;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return { user: { id: user.id, email: user.email ?? null }, profile };
}

export async function requireAdmin() {
  const session = await getCurrentProfile();
  if (!session || session.profile.role !== "admin") {
    throw new AuthError("Nicht autorisiert", 403);
  }
  return session;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
