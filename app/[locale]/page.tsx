import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function Home() {
  const t = await getTranslations("Common");

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">{t("appName")}</h1>
      <p className="text-muted-foreground max-w-md text-balance">
        The marketing site lands in a later phase. Auth already works — try{" "}
        <Link href="/signup" className="underline underline-offset-4">
          /signup
        </Link>
        .
      </p>
    </main>
  );
}
