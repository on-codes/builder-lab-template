// No jsdom pragma, no next-intl/@/i18n/navigation mocks needed — global-error.tsx has zero
// external dependencies by design (see its own header comment). renderToStaticMarkup, not RTL's
// DOM-mounting render(), because this component's root element is <html>/<body> itself (it
// replaces the whole document) — the same reason emails/*.test.tsx render to a string instead
// of mounting into jsdom.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import GlobalError from "./global-error";

describe("GlobalError", () => {
  it("renders a friendly message, never the raw error, with a link home", () => {
    const reset = vi.fn<() => void>();
    const html = renderToStaticMarkup(
      <GlobalError error={new Error("raw internal detail")} reset={reset} />,
    );

    expect(html).toContain("Something went wrong");
    expect(html).not.toContain("raw internal detail");
    expect(html).toContain('href="/"');
  });
});
