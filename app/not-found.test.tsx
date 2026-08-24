// Same reasoning as global-error.test.tsx — this file has zero external dependencies by
// design, and its root element is <html>/<body>, so renderToStaticMarkup rather than RTL's
// DOM-mounting render().
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import NotFound from "./not-found";

describe("root NotFound", () => {
  it("renders a friendly message with a link home", () => {
    const html = renderToStaticMarkup(<NotFound />);

    expect(html).toContain("Page not found");
    expect(html).toContain('href="/"');
  });
});
