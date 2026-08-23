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
import { useRouter } from "@/i18n/navigation";
import { resendMfaCode, verifyMfaCode } from "@/lib/actions/auth/verify-mfa";

// Must match RESEND_COOLDOWN_SECONDS in lib/auth/otp.ts — this is only the client-side
// countdown display, the server independently re-checks and is the real enforcement.
const RESEND_COOLDOWN_SECONDS = 30;

type FormValues = { code: string };

export function VerifyMfaForm({ ttlMinutes }: { ttlMinutes: number }) {
  const t = useTranslations("Auth.VerifyMfa");
  const tValidation = useTranslations("Validation");
  const tCommon = useTranslations("Common");
  const router = useRouter();

  const [isVerifying, startVerifying] = useTransition();
  const [isResending, startResending] = useTransition();
  const [cooldown, setCooldown] = useState(0);

  const schema = z.object({
    code: z.string().regex(/^\d{6}$/, { message: tValidation("otpInvalid") }),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: "" },
  });

  useEffect(() => {
    if (cooldown === 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function onSubmit(values: FormValues) {
    startVerifying(async () => {
      const result = await verifyMfaCode({ code: values.code });
      if (result.success) {
        router.push("/dashboard");
        return;
      }

      switch (result.error) {
        case "INVALID_INPUT":
          form.setError("code", { message: tValidation("otpInvalid") });
          break;
        case "EXPIRED":
          form.setError("code", { message: t("expiredCode") });
          break;
        case "INVALID_CODE":
          form.setError("code", { message: t("invalidCode") });
          break;
        case "LOCKED":
          form.setError("code", { message: t("tooManyAttempts") });
          break;
        case "NO_PENDING_CHALLENGE":
          toast.error(t("sessionExpired"));
          router.replace("/login");
          break;
        case "RATE_LIMITED":
          toast.error(tCommon("rateLimited"));
          break;
        default:
          toast.error(tCommon("genericError"));
      }
    });
  }

  function onResend() {
    startResending(async () => {
      const result = await resendMfaCode();
      if (result.success) {
        toast.success(t("resendSuccess"));
        setCooldown(RESEND_COOLDOWN_SECONDS);
        return;
      }

      switch (result.error) {
        case "NO_PENDING_CHALLENGE":
          toast.error(t("sessionExpired"));
          router.replace("/login");
          break;
        case "RATE_LIMITED":
          toast.error(tCommon("rateLimited"));
          setCooldown(RESEND_COOLDOWN_SECONDS);
          break;
        default:
          toast.error(tCommon("genericError"));
      }
    });
  }

  const resendDisabled = isResending || cooldown > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description", { minutes: ttlMinutes })}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("codeLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="123456"
                      onChange={(event) =>
                        field.onChange(event.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isVerifying} className="w-full">
              {isVerifying ? t("submitting") : t("submit")}
            </Button>
          </form>
        </Form>
        <Button
          type="button"
          variant="link"
          className="w-full"
          disabled={resendDisabled}
          onClick={onResend}
          aria-live="polite"
        >
          {cooldown > 0 ? t("resendCooldown", { seconds: cooldown }) : t("resend")}
        </Button>
      </CardContent>
    </Card>
  );
}
