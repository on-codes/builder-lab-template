import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireUser, UnauthorizedError } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ProfileSettingsForm } from "./profile-settings-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Settings.Profile.metadata");
  return { title: t("title") };
}

export default async function ProfileSettingsPage() {
  // requireUser() is the authoritative check (see lib/auth/session.ts) — same reasoning as
  // the security and billing settings pages.
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
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <ProfileSettingsForm
      email={user.email}
      initialDisplayName={profile?.display_name ?? ""}
      initialAvatarUrl={profile?.avatar_url ?? null}
    />
  );
}
