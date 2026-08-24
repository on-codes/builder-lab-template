"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/actions/auth/sign-out";
import { getInitials } from "@/lib/utils";

type UserMenuProps = {
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};

/**
 * Topbar account menu — avatar trigger, email, a link to Settings, and sign-out. Client-side
 * because it needs interactivity (the dropdown open state and useTransition around the
 * sign-out Server Action); everything else in the dashboard shell stays server-rendered.
 */
export function UserMenu({ email, displayName, avatarUrl }: UserMenuProps) {
  const t = useTranslations("Dashboard.nav");
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    // signOut() redirects internally (see lib/actions/auth/sign-out.ts) — it never resolves
    // with a value to branch on, so this is fire-and-forget from the transition's point of
    // view; `void` documents that intentionally, same convention as lib/auth/session.ts.
    startTransition(() => {
      void signOut();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label={t("accountMenu")}>
          <Avatar>
            {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
            <AvatarFallback>{getInitials(displayName, email)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-muted-foreground truncate text-xs font-normal">
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={isPending} onSelect={handleSignOut}>
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
