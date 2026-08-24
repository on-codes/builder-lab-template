"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { requestPasswordReset } from "@/lib/actions/auth/password-reset";

type FormValues = { email: string };

export function ForgotPasswordForm() {
  const t = useTranslations("Auth.ForgotPassword");
  const tValidation = useTranslations("Validation");
  const tCommon = useTranslations("Common");
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  const schema = z.object({
    email: z.string().email({ message: tValidation("emailInvalid") }),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await requestPasswordReset(values);
      if (!result.success && result.error === "RATE_LIMITED") {
        toast.error(tCommon("rateLimited"));
        return;
      }

      // Enumeration-safe: success and any other failure (including UNKNOWN) show the exact
      // same message — never reveal whether the email had an account. See
      // lib/actions/auth/password-reset.ts and specs/authentication/spec.md.
      setSubmitted(true);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {submitted ? (
          <p className="text-sm">{t("checkEmail")}</p>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("emailLabel")}</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" {...field} />
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
      <CardFooter>
        <Link href="/login" className="text-sm underline underline-offset-4">
          {t("backToLogin")}
        </Link>
      </CardFooter>
    </Card>
  );
}
