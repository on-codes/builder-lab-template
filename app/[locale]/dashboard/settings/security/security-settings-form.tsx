"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { disableMfa, enableMfa } from "@/lib/actions/auth/mfa-toggle";
import { revokeSession } from "@/lib/actions/auth/sessions";
import type { SessionSummary } from "@/lib/auth/session";

type SecuritySettingsFormProps = {
  initialMfaEnabled: boolean;
  initialSessions: SessionSummary[];
};

// Locale left as `undefined` (runtime default) rather than read via next-intl's `useLocale` —
// this template only ships "en" today (see i18n/routing.ts), and Intl.RelativeTimeFormat
// falls back to the environment's default locale, which is "en" everywhere this runs.
// Revisit once a second locale actually exists.
const RELATIVE_TIME_DIVISIONS: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
  { unit: "year", seconds: 60 * 60 * 24 * 365 },
  { unit: "month", seconds: 60 * 60 * 24 * 30 },
  { unit: "week", seconds: 60 * 60 * 24 * 7 },
  { unit: "day", seconds: 60 * 60 * 24 },
  { unit: "hour", seconds: 60 * 60 },
  { unit: "minute", seconds: 60 },
];

function formatRelativeTime(iso: string): string {
  const diffSeconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  for (const { unit, seconds } of RELATIVE_TIME_DIVISIONS) {
    if (Math.abs(diffSeconds) >= seconds) {
      return rtf.format(Math.round(diffSeconds / seconds), unit);
    }
  }
  return rtf.format(diffSeconds, "second");
}

export function SecuritySettingsForm({
  initialMfaEnabled,
  initialSessions,
}: SecuritySettingsFormProps) {
  const t = useTranslations("Settings.Security");
  const router = useRouter();

  const [mfaEnabled, setMfaEnabled] = useState(initialMfaEnabled);
  const [isMfaPending, startMfaTransition] = useTransition();
  const [sessions, setSessions] = useState(initialSessions);

  function handleMfaToggle(nextChecked: boolean) {
    const previous = mfaEnabled;
    setMfaEnabled(nextChecked); // optimistic — reverted below if the action fails
    startMfaTransition(async () => {
      const result = nextChecked ? await enableMfa() : await disableMfa();
      if (!result.success) {
        setMfaEnabled(previous);
        toast.error(t("mfaToggleError"));
      }
    });
  }

  function handleSessionRevoked(sessionId: string, signedOutCurrentDevice: boolean) {
    if (signedOutCurrentDevice) {
      router.push("/login");
      return;
    }
    setSessions((current) => current.filter((session) => session.id !== sessionId));
    toast.success(t("sessionRevoked"));
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("mfaSectionTitle")}</CardTitle>
          <CardDescription>{t("mfaSectionDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="mfa-toggle">{mfaEnabled ? t("mfaEnabled") : t("mfaDisabled")}</Label>
            <Switch
              id="mfa-toggle"
              checked={mfaEnabled}
              onCheckedChange={handleMfaToggle}
              disabled={isMfaPending}
              aria-label={mfaEnabled ? t("mfaDisableAction") : t("mfaEnableAction")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("sessionsSectionTitle")}</CardTitle>
          <CardDescription>{t("sessionsSectionDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("sessionsEmpty")}</p>
          ) : (
            <div className="flex flex-col gap-4">
              {sessions.map((session, index) => (
                <div key={session.id} className="flex flex-col gap-4">
                  {index > 0 && <Separator />}
                  <SessionRow session={session} onRevoked={handleSessionRevoked} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SessionRow({
  session,
  onRevoked,
}: {
  session: SessionSummary;
  onRevoked: (sessionId: string, signedOutCurrentDevice: boolean) => void;
}) {
  const t = useTranslations("Settings.Security");
  const tCommon = useTranslations("Common");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirmRevoke() {
    startTransition(async () => {
      const result = await revokeSession(session.id);
      setOpen(false);
      if (!result.success) {
        toast.error(t("sessionRevokeError"));
        return;
      }
      onRevoked(session.id, result.data.signedOutCurrentDevice);
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      {/* min-w-0 lets this block shrink below its content size so the raw User-Agent string
          below actually wraps inside the row instead of being held to its unshrunk width by
          the sibling button; break-words is the backstop for a single unbroken token. Stacked
          under the button below `sm` so the text gets the full row width on a narrow phone
          instead of being squeezed into a fraction of it. */}
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <span className="break-words">{session.userAgent ?? t("sessionUnknownDevice")}</span>
          {session.isCurrent && (
            <span className="bg-secondary text-secondary-foreground shrink-0 rounded-full px-2 py-0.5 text-xs font-medium">
              {t("sessionCurrent")}
            </span>
          )}
        </div>
        <span className="text-muted-foreground text-xs">
          {t("sessionCreatedAt", { relativeTime: formatRelativeTime(session.createdAt) })}
        </span>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="self-start sm:self-auto">
            {t("sessionRevoke")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("sessionRevokeConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {session.isCurrent
                ? t("sessionRevokeConfirmDescriptionCurrent")
                : t("sessionRevokeConfirmDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{tCommon("cancel")}</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleConfirmRevoke} disabled={isPending}>
              {t("sessionRevoke")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
