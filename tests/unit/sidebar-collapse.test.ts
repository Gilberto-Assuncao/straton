import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The button that collapses the sidebar has to be on top of the header.
 *
 * Reported with a screenshot: half of it was missing. Both the sidebar wrapper
 * and the header were `z-30`, and the header comes later in the DOM, so it
 * painted over the half of the button that sticks out past the sidebar's edge
 * — the header is a full-width bar with a background and a backdrop blur, and
 * the button hangs 16px into it.
 *
 * Nothing failed. The button rendered, the tests passed, and half of it was
 * both invisible and unclickable, because a covered element does not receive
 * the click either.
 *
 * The layering is what fixes it, not the position: the header grows a second
 * row when there are breadcrumbs, so moving the button below "the header" is a
 * guess about a height that changes. `e2e/sidebar.spec.ts` presses it, which is
 * the only way to prove nothing is on top of it.
 */
function layer(file: string, pattern: RegExp, what: string): number {
  const match = readFileSync(file, "utf8").match(pattern);
  // Without this the regex could stop matching after a refactor and the
  // comparison below would silently compare two defaults.
  expect(match, `could not read the ${what} layer — the class list changed`).not.toBeNull();
  return Number(match![1]);
}

describe("the sidebar collapse button", () => {
  it("sits above the header, not under it", () => {
    const sidebar = layer(
      "src/components/app-shell/AppShell.tsx",
      /fixed inset-y-0 left-0 z-(\d+) hidden lg:block/,
      "sidebar",
    );
    const header = layer(
      "src/components/app-shell/GlobalHeader.tsx",
      /sticky top-0 z-(\d+)/,
      "header",
    );
    expect(sidebar, `sidebar z-${sidebar} must beat header z-${header}`).toBeGreaterThan(header);
  });

  it("says what it does in the reader's language", () => {
    // It read "Collapse sidebar", in English, in a product that speaks ten —
    // and only a screen reader would ever have said so.
    const source = readFileSync("src/components/app-shell/AppShell.tsx", "utf8");
    expect(source).not.toContain('"Collapse sidebar"');
    expect(source).not.toContain('"Expand sidebar"');
    expect(source).toMatch(/aria-label=\{collapsed\?tShell\("expandNavigation"\):tShell\("collapseNavigation"\)\}/);
  });
});
