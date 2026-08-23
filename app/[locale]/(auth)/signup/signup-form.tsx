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
import { signUp } from "@/lib/actions/auth/sign-up";

export function SignupForm() {
  const t = useTranslations("Auth.Signup");
  const tValidation = useTranslations("Validation");
  const tCommon = useTranslations("Common");
  const [isPending, startTransition] = useTransition();
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const signupSchema = z
    .object({
      email: z.string().min(1, tValidation("required")).email(tValidation("emailInvalid")),
      password: z.string().min(12, tValidation("passwordTooShort")),
      confirmPassword: z.string().min(1, tValidation("required")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: tValidation("passwordsDontMatch"),
      path: ["confirmPassword"],
    });

  type SignupValues = z.infer<typeof signupSchema>;

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  function onSubmit(values: SignupValues) {
    startTransition(async () => {
      try {
        const result = await signUp({ email: values.email, password: values.password });

        if (!result.success) {
          switch (result.error) {
            case "PASSWORD_TOO_SHORT":
              form.setError("password", { message: tValidation("passwordTooShort") });
              break;
            case "PASSWORD_TOO_WEAK":
              form.setError("password", { message: tValidation("passwordTooWeak") });
              break;
            case "PASSWORD_BREACHED":
              form.setError("password", { message: tValidation("passwordBreached") });
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

        setSubmittedEmail(result.data.email);
      } catch (error) {
        console.error("signUp action failed", error);
        toast.error(tCommon("genericError"));
      }
    });
  }

  if (submittedEmail) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("checkEmail")}</CardDescription>
        </CardHeader>
      </Card>
    );
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
                  <FormLabel>{t("passwordLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      disabled={isPending}
                      {...field}
                    />
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
                    <Input
                      type="password"
                      autoComplete="new-password"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <p className="text-muted-foreground text-sm">{t("termsNotice")}</p>
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? t("submitting") : t("submit")}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex-wrap justify-center gap-1 text-sm">
        <span className="text-muted-foreground">{t("haveAccount")}</span>
        <Link href="/login" className="underline underline-offset-4">
          {t("logInLink")}
        </Link>
      </CardFooter>
    </Card>
  );
}
