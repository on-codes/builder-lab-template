"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
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
import { Link, useRouter } from "@/i18n/navigation";
import { logIn } from "@/lib/actions/auth/log-in";

export function LoginForm() {
  const t = useTranslations("Auth.Login");
  const tValidation = useTranslations("Validation");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const loginSchema = z.object({
    email: z.string().min(1, tValidation("required")).email(tValidation("emailInvalid")),
    password: z.string().min(1, tValidation("required")),
  });

  type LoginValues = z.infer<typeof loginSchema>;

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: LoginValues) {
    startTransition(async () => {
      try {
        const result = await logIn(values);

        if (!result.success) {
          switch (result.error) {
            case "INVALID_CREDENTIALS":
              form.setError("password", { message: t("invalidCredentials") });
              break;
            case "EMAIL_NOT_VERIFIED":
              form.setError("password", { message: t("verifyEmailFirst") });
              break;
            case "RATE_LIMITED":
              toast.error(tCommon("rateLimited"));
              break;
            case "INVALID_INPUT":
            case "UNKNOWN":
              toast.error(tCommon("genericError"));
              break;
          }
          return;
        }

        router.push(result.data.mfaRequired ? "/verify-mfa" : "/dashboard");
      } catch (error) {
        console.error("logIn action failed", error);
        toast.error(tCommon("genericError"));
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("emailLabel")}</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" disabled={isPending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-2">
                    <FormLabel>{t("passwordLabel")}</FormLabel>
                    <Link
                      href="/forgot-password"
                      className="text-muted-foreground text-sm underline underline-offset-4"
                    >
                      {t("forgotPassword")}
                    </Link>
                  </div>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      disabled={isPending}
                      {...field}
                    />
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
      </CardContent>
      <CardFooter className="flex-wrap justify-center gap-1 text-sm">
        <span className="text-muted-foreground">{t("noAccount")}</span>
        <Link href="/signup" className="underline underline-offset-4">
          {t("signUpLink")}
        </Link>
      </CardFooter>
    </Card>
  );
}
