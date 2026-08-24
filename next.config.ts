import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const isDev = process.env.NODE_ENV === "development";

// Supabase project origin, derived from the same public env var the browser Supabase client
// uses (lib/supabase/client.ts) rather than hardcoded, so connect-src always matches whatever
// project this clone is wired to. Falls back to omitting the extra origin (never to the
// literal string "undefined") if the env var isn't set wherever this config happens to load.
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
})();

// Content-Security-Policy — see .claude/skills/app-security/SKILL.md. Static policy, no
// per-request nonce: this app has no custom inline <script> tags to protect with a nonce, and
// nonces require generating a fresh one per request in proxy.ts, which forces every page into
// dynamic rendering (loses static optimization/ISR/PPR) — out of scope for this phase. This
// follows Next's own documented "Without Nonces" reference policy — see
// node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md.
//
// Directive-by-directive reasoning, re-derived from what this app actually loads (checked
// during the Phase 9 security pass, not assumed):
// - script-src: no third-party scripts anywhere — grepped for stripe.js/js.stripe.com/
//   <script src=/next-script usage; none found. Stripe is never loaded client-side: both
//   lib/actions/billing/checkout.ts and portal.ts create a Stripe-hosted Checkout/Customer
//   Portal session server-side and redirect the browser to session.url — no Stripe.js, no
//   Stripe Elements embedded anywhere. 'unsafe-inline' is still required because Next's App
//   Router runtime itself emits inline <script> tags for RSC/hydration payload streaming
//   (`self.__next_f.push(...)`) on every page regardless of app code — those aren't nonced
//   without proxy-based nonce generation, so plain 'self' would break hydration everywhere.
//   'unsafe-eval' is dev-only (React dev-mode stack-trace reconstruction; unused in prod).
// - style-src: needs 'unsafe-inline'. Radix UI (dropdown-menu, dialog — both used under
//   components/ui/) positions its portalled popper content by setting inline `style`
//   attributes (position/transform) via JS at runtime, not via a stylesheet, and Sonner's
//   <Toaster /> (components/ui/sonner.tsx) sets CSS custom properties via an inline `style`
//   prop too. Without 'unsafe-inline' here the dropdown menu and dialogs silently fail to
//   position themselves. Not narrowed to style-src-attr — same effect here, weaker support.
// - connect-src: 'self' plus the Supabase project origin (see supabaseOrigin above) —
//   lib/supabase/client.ts creates a browser Supabase client that calls the Supabase Auth API
//   directly from the browser. No Realtime/WebSocket usage anywhere in the codebase (grepped
//   for .channel(/realtime/.subscribe() — none), so no wss: scheme is needed.
// - img-src: 'self', data:, plus the Supabase project origin — user-uploaded profile pictures
//   (see openspec/changes/add-profile-settings) are stored in a public Supabase Storage bucket
//   and rendered directly via AvatarImage (components/ui/avatar.tsx) as a plain <img src>, not
//   next/image, so no images.remotePatterns entry is needed alongside this. data: covers
//   inline data-URI icons.
// - font-src: 'self' — Geist (geist/font/sans, geist/font/mono, used in
//   app/[locale]/layout.tsx) self-hosts its font files at build time; no Google Fonts CDN.
// - frame-ancestors 'none' / form-action 'self' / base-uri 'self' / object-src 'none': no
//   legitimate reason for this app's pages to be framed by another site, its forms to submit
//   elsewhere, its <base> to be rewritten, or a plugin/object embed to load anything.
// If a future change adds a real third-party script or a remote image host, this policy needs
// a matching, deliberate update — don't silently relax it to fix a console warning.
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:${supabaseOrigin ? ` ${supabaseOrigin}` : ""};
  font-src 'self';
  connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin}` : ""};
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig: NextConfig = {
  // Security headers — see .claude/skills/app-security/SKILL.md.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
