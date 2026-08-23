"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Link, useRouter } from "@/i18n/navigation";
import { validateNewPasswordForReset } from "@/lib/actions/auth/password-reset";
import { createClient } from "@/lib/supabase/client";

type FormValues = { password: string; confirmPassword: string };
type Status = "loading" | "invalid" | "ready" | "success";

// Give the person a moment to read the success message before we send them to /login.
const REDIRECT_DELAY_MS = 1500;

export function ResetPasswordForm() {
  const t = useTranslations("Auth.ResetPassword");
  const tValidation = useTranslations("Validation");
  const tCommon = useTranslations("Common");
  const router = useRouter();

  // A single browser client instance for the whole lifetime of this screen — the recovery
  // session established below only ever lives in this instance, never a Server Action (see
  // lib/actions/auth/password-reset.ts's file comment).
  const [supabase] = useState(() => createClient());
  const [status, setStatus] = useState<Status>("loading");
  const [isPending, startTransition] = useTransition();

  const schema = z
    .object({
      password: z.string().min(12, { message: tValidation("passwordTooShort") }),
      confirmPassword: z.string().min(1, { message: tValidation("required") }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: tValidation("passwordsDontMatch"),
      path: ["confirmPassword"],
    });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    // Supabase delivers the recovery tokens via the URL fragment, which never reaches the
    // server by design — so this has to run client-side, on mount, reading window.location
    // directly rather than any server-provided prop.
    async function establishRecoverySession() {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (!accessToken || !refreshToken) {
        setStatus("invalid");
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      setStatus(error ? "invalid" : "ready");
    }

    void establishRecoverySession();
  }, [supabase]);

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const validation = await validateNewPasswordForReset({ password: values.password });
      if (!validation.success) {
        const key =
          validation.error === "PASSWORD_TOO_SHORT"
            ? "passwordTooShort"
            : validation.error === "PASSWORD_TOO_WEAK"
              ? "passwordTooWeak"
              : validation.error === "PASSWORD_BREACHED"
                ? "passwordBreached"
                : "required";
        form.setError("password", { message: tValidation(key) });
        return;
      }

      // The recovery session only exists in this browser client — updateUser has to be
      // called here, not as a Server Action.
      const { error } = await supabase.auth.updateUser({ password: values.password });
      if (error) {
        toast.error(tCommon("genericError"));
        return;
      }

      setStatus("success");
      await supabase.auth.signOut();
      setTimeout(() => router.replace("/login"), REDIRECT_DELAY_MS);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        {status === "ready" && <CardDescription>{t("description")}</CardDescription>}
        {status === "invalid" && <CardDescription>{t("invalidLink")}</CardDescription>}
      </CardHeader>
      <CardContent>
        {status === "loading" && (
          <p className="text-muted-foreground text-sm">{tCommon("loading")}</p>
        )}

        {status === "invalid" && (
          <Link href="/forgot-password" className="text-sm underline underline-offset-4">
            {t("requestNewLink")}
          </Link>
        )}

        {status === "success" && <p className="text-sm">{t("success")}</p>}

        {status === "ready" && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("passwordLabel")}</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("confirmPasswordLabel")}</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? t("submitting") : t("submit")}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
