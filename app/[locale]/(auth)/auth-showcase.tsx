import { CreditCardIcon, GlobeIcon, LayoutDashboardIcon, ShieldCheckIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// Same four pillars shown on the marketing homepage (see (marketing)/page.tsx) — reused here
// rather than duplicated, so the auth screens and the homepage always tell the same product
// story from one catalog entry. Order matches Marketing.Home.features in messages/en.json.
const FEATURES = [
  { key: "auth", icon: ShieldCheckIcon },
  { key: "billing", icon: CreditCardIcon },
  { key: "dashboard", icon: LayoutDashboardIcon },
  { key: "i18n", icon: GlobeIcon },
] as const;

// The branded panel that sits beside the form on every auth screen (login, signup, forgot/reset
// password, MFA challenge) — see ./layout.tsx, which hides this entirely below `lg` so small
// screens only ever see the form. Structure mirrors a common split-screen auth pattern (brand
// mark, headline, value props); the colors are this template's own theme tokens, not copied
// from wherever the pattern was borrowed from.
export async function AuthShowcase() {
  const common = await getTranslations("Common");
  const t = await getTranslations("Marketing.Home");

  return (
    <div className="bg-primary text-primary-foreground relative hidden flex-col justify-between gap-10 p-10 lg:flex">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        {common("appName")}
      </Link>

      <div className="flex flex-col gap-4">
        <p className="text-3xl font-semibold tracking-tight text-balance xl:text-4xl">
          {t("heroTitle")}
        </p>
        <p className="text-primary-foreground/80 max-w-md text-balance">{t("heroSubtitle")}</p>
      </div>

      <ul className="grid grid-cols-2 gap-x-6 gap-y-5">
        {FEATURES.map(({ key, icon: Icon }) => (
          <li key={key} className="flex items-center gap-2.5 text-sm font-medium text-balance">
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            {t(`features.${key}.title`)}
          </li>
        ))}
      </ul>
    </div>
  );
}
