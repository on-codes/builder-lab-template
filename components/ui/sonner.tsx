"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import type * as React from "react";

/**
 * Mount once in the root layout. Call the `toast()` function from "sonner" anywhere else —
 * see https://sonner.emilkowal.ski. Theme follows the system by default; this template
 * doesn't have a light/dark toggle yet, so `theme="system"` is the only mode wired up.
 */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
