"use client";

import { ChevronsUpDownIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { signOut } from "@/lib/actions/auth/sign-out";

type UserMenuProps = {
  email: string;
};

function getInitials(email: string): string {
  const [localPart] = email.split("@");
  return localPart.slice(0, 2).toUpperCase();
}

/**
 * The sidebar's bottom account row — avatar, email, and a dropdown with sign-out. Rendered as
 * a SidebarMenuButton so it shrinks to just the avatar when the sidebar is collapsed to icons
 * (see sidebarMenuButtonVariants' icon-mode override in components/ui/sidebar.tsx), which is
 * also why this now needs a SidebarProvider ancestor — see user-menu.test.tsx. Client-side
 * because it needs interactivity (the dropdown open state and useTransition around the
 * sign-out Server Action); everything else in the dashboard shell stays server-rendered.
 */
export function UserMenu({ email }: UserMenuProps) {
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
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              aria-label={t("accountMenu")}
              // The base icon-collapsed override (components/ui/sidebar.tsx) sizes this button
              // to fit the 16px nav icons with 8px padding; the 32px avatar here needs the
              // padding gone instead, or it gets clipped against the button's own bounds.
              className="group-data-[collapsible=icon]:p-0!"
            >
              {/* ring-sidebar-border: the fallback's bg-muted circle reads fine on the plain
                  dashboard background it was designed for, but barely contrasts against the
                  sidebar's own near-white surface — a hairline ring keeps its edge legible in
                  both themes without a one-off color. */}
              <Avatar className="ring-1 ring-sidebar-border">
                <AvatarFallback>{getInitials(email)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate">{email}</span>
              <ChevronsUpDownIcon className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
          >
            <DropdownMenuLabel className="text-muted-foreground truncate text-xs font-normal">
              {email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={isPending} onSelect={handleSignOut}>
              {t("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
