import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { listSessions } from "@/lib/actions/auth/sessions";
import { requireUser, type SessionSummary, UnauthorizedError } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { SecuritySettingsForm } from "./security-settings-form";

const NO_SESSIONS: SessionSummary[] = [];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Settings.Security.metadata");
  return { title: t("title") };
}

export default async function SecuritySettingsPage() {
  // requireUser() is the authoritative check (see lib/auth/session.ts): proxy.ts already
  // redirects unauthenticated requests away from /dashboard, but it only checks that the
  // bl_session cookie exists, not that the underlying row hasn't been revoked since — e.g. a
  // session ended from another device. Catching that here instead of letting it crash to a
  // generic error page keeps this consistent with every Server Action's own UnauthorizedError
  // handling (see CLAUDE.md 2: no dead ends for a non-technical person).
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      const locale = await getLocale();
      redirect({ href: "/login", locale });
    }
    throw error;
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("mfa_enabled")
    .eq("id", user.id)
    .single();

  const sessionsResult = await listSessions();
  const initialSessions = sessionsResult.success ? sessionsResult.data : NO_SESSIONS;

  return (
    <SecuritySettingsForm
      initialMfaEnabled={profile?.mfa_enabled ?? false}
      initialSessions={initialSessions}
    />
  );
}
