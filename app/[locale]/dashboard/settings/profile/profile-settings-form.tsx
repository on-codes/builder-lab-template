"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import type * as React from "react";
import { useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { removeAvatar, uploadAvatar } from "@/lib/actions/profile/avatar";
import { requestEmailChange } from "@/lib/actions/profile/change-email";
import { updateDisplayName } from "@/lib/actions/profile/update-profile";
import { getInitials } from "@/lib/utils";

type ProfileSettingsFormProps = {
  email: string;
  initialDisplayName: string;
  initialAvatarUrl: string | null;
};

// Kept in sync with the server-side checks in lib/actions/profile/avatar.ts — this is only a
// fast client-side rejection for obvious cases; the server action is what actually enforces it.
const ALLOWED_AVATAR_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export function ProfileSettingsForm({
  email,
  initialDisplayName,
  initialAvatarUrl,
}: ProfileSettingsFormProps) {
  const t = useTranslations("Settings.Profile");

  // Lifted here (not local to each section) so a successful avatar upload/removal is reflected
  // immediately in the fallback-initials shown next to the name field too.
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("profileSectionTitle")}</CardTitle>
          <CardDescription>{t("profileSectionDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <AvatarSection
            email={email}
            displayName={displayName}
            avatarUrl={avatarUrl}
            onAvatarChange={setAvatarUrl}
          />
          <NameForm displayName={displayName} onDisplayNameChange={setDisplayName} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("emailSectionTitle")}</CardTitle>
          <CardDescription>{t("emailSectionDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <EmailSection email={email} />
        </CardContent>
      </Card>
    </div>
  );
}

function AvatarSection({
  email,
  displayName,
  avatarUrl,
  onAvatarChange,
}: {
  email: string;
  displayName: string;
  avatarUrl: string | null;
  onAvatarChange: (avatarUrl: string | null) => void;
}) {
  const t = useTranslations("Settings.Profile");
  const tCommon = useTranslations("Common");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, startUploadTransition] = useTransition();
  const [isRemoving, startRemoveTransition] = useTransition();
  const isPending = isUploading || isRemoving;

  function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // lets the same file be picked again after an error
    if (!file) return;

    if (file.size > MAX_AVATAR_BYTES) {
      toast.error(t("avatarUploadErrorTooLarge"));
      return;
    }
    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      toast.error(t("avatarUploadErrorInvalidType"));
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    startUploadTransition(async () => {
      const result = await uploadAvatar(formData);
      if (!result.success) {
        switch (result.error) {
          case "FILE_TOO_LARGE":
            toast.error(t("avatarUploadErrorTooLarge"));
            break;
          case "INVALID_FILE_TYPE":
            toast.error(t("avatarUploadErrorInvalidType"));
            break;
          case "RATE_LIMITED":
            toast.error(tCommon("rateLimited"));
            break;
          default:
            toast.error(t("avatarUploadError"));
        }
        return;
      }
      onAvatarChange(result.data.avatarUrl);
      toast.success(t("avatarUpdated"));
    });
  }

  function handleRemove() {
    startRemoveTransition(async () => {
      const result = await removeAvatar();
      if (!result.success) {
        toast.error(t("avatarRemoveError"));
        return;
      }
      onAvatarChange(null);
      toast.success(t("avatarRemoved"));
    });
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-16">
        {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
        <AvatarFallback className="text-lg">{getInitials(displayName, email)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading
              ? t("avatarUploading")
              : avatarUrl
                ? t("avatarEditAction")
                : t("avatarUploadAction")}
          </Button>
          {avatarUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={handleRemove}
            >
              {isRemoving ? t("avatarRemoving") : t("avatarRemoveAction")}
            </Button>
          )}
        </div>
        <p className="text-muted-foreground text-xs">{t("avatarHelp")}</p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFileSelected}
        aria-label={t("avatarUploadAction")}
      />
    </div>
  );
}

function NameForm({
  displayName,
  onDisplayNameChange,
}: {
  displayName: string;
  onDisplayNameChange: (displayName: string) => void;
}) {
  const t = useTranslations("Settings.Profile");
  const tCommon = useTranslations("Common");
  const tValidation = useTranslations("Validation");
  const [isPending, startTransition] = useTransition();

  const nameSchema = z.object({
    displayName: z
      .string()
      .trim()
      .min(1, tValidation("required"))
      .max(80, tValidation("nameTooLong")),
  });
  type NameValues = z.infer<typeof nameSchema>;

  const form = useForm<NameValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: { displayName },
  });

  function onSubmit(values: NameValues) {
    startTransition(async () => {
      const result = await updateDisplayName({ displayName: values.displayName });
      if (!result.success) {
        if (result.error === "INVALID_INPUT") {
          form.setError("displayName", { message: tValidation("nameTooLong") });
        } else {
          toast.error(tCommon("genericError"));
        }
        return;
      }
      onDisplayNameChange(result.data.displayName);
      form.reset({ displayName: result.data.displayName });
      toast.success(t("nameUpdated"));
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex max-w-sm flex-col gap-4">
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("nameLabel")}</FormLabel>
              <FormControl>
                <Input autoComplete="name" disabled={isPending} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending} className="w-fit">
          {isPending ? t("nameSaving") : tCommon("save")}
        </Button>
      </form>
    </Form>
  );
}

function EmailSection({ email }: { email: string }) {
  const t = useTranslations("Settings.Profile");
  const tCommon = useTranslations("Common");
  const tValidation = useTranslations("Validation");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const changeEmailSchema = z.object({
    newEmail: z.string().min(1, tValidation("required")).email(tValidation("emailInvalid")),
    currentPassword: z.string().min(1, tValidation("required")),
  });
  type ChangeEmailValues = z.infer<typeof changeEmailSchema>;

  const form = useForm<ChangeEmailValues>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: { newEmail: "", currentPassword: "" },
  });

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) form.reset();
  }

  function onSubmit(values: ChangeEmailValues) {
    startTransition(async () => {
      const result = await requestEmailChange(values);
      if (!result.success) {
        switch (result.error) {
          case "INVALID_PASSWORD":
            form.setError("currentPassword", { message: t("changeEmailErrorInvalidPassword") });
            break;
          case "SAME_EMAIL":
            form.setError("newEmail", { message: t("changeEmailErrorSameEmail") });
            break;
          case "EMAIL_IN_USE":
            form.setError("newEmail", { message: t("changeEmailErrorEmailInUse") });
            break;
          case "RATE_LIMITED":
            toast.error(tCommon("rateLimited"));
            break;
          default:
            toast.error(tCommon("genericError"));
        }
        return;
      }
      handleOpenChange(false);
      toast.success(t("changeEmailSuccess"));
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="current-email">{t("emailLabel")}</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          id="current-email"
          type="email"
          value={email}
          disabled
          readOnly
          className="max-w-sm"
        />
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline">
              {t("changeEmailAction")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("changeEmailDialogTitle")}</DialogTitle>
              <DialogDescription>{t("changeEmailDialogDescription")}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <FormField
                  control={form.control}
                  name="newEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("newEmailLabel")}</FormLabel>
                      <FormControl>
                        <Input type="email" autoComplete="email" disabled={isPending} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("currentPasswordLabel")}</FormLabel>
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
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      {tCommon("cancel")}
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? t("changeEmailSubmitting") : t("changeEmailSubmit")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <p className="text-muted-foreground text-sm">{t("emailHelp")}</p>
    </div>
  );
}
