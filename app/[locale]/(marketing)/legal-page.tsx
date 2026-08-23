import { TriangleAlertIcon } from "lucide-react";
import type { getTranslations } from "next-intl/server";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Translator = Awaited<ReturnType<typeof getTranslations>>;

type LegalPageProps = {
  t: Translator;
  sectionKeys: readonly string[];
};

/**
 * Shared shell for /terms and /privacy: a title, a "last updated" line, a placeholder-content
 * warning, then a list of sections. Takes an already-resolved translator rather than a
 * namespace string so this stays a plain synchronous component — the two page.tsx files are
 * the only async part (they await getTranslations before rendering this).
 */
export function LegalPage({ t, sectionKeys }: LegalPageProps) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-16 md:px-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("lastUpdated")}</p>
      </div>

      <Alert variant="warning">
        <TriangleAlertIcon aria-hidden="true" />
        <AlertTitle>{t("notice.title")}</AlertTitle>
        <AlertDescription>{t("notice.body")}</AlertDescription>
      </Alert>

      <div className="flex flex-col gap-8">
        {sectionKeys.map((key) => (
          <section key={key} className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold tracking-tight">{t(`sections.${key}.title`)}</h2>
            <p className="text-muted-foreground text-balance">{t(`sections.${key}.body`)}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
