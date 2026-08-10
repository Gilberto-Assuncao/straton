import { existsSync, readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

/**
 * Next loads `.env.local` for the app; this process is not the app.
 *
 * Without it the tests would run against an app that is correctly configured
 * while the assertions have no database to check against — and a helper that
 * cannot look would have to trust the screen, which is the one thing these
 * tests exist not to do. Read here rather than added as a dependency: it is
 * eight lines, and it never overrides what CI already set.
 */
for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

/**
 * End-to-end tests: the button does what it says.
 *
 * The suite already had two layers — unit tests for the arithmetic, RLS tests
 * for who may do what against a real database. Both were green through every
 * bug reported from production, because neither of them ever pressed anything.
 *
 * This is the third layer, and it exists for a specific class of failure: the
 * screen that reports success and changes nothing. A missing delete policy makes
 * RLS refuse every row silently — no error, a green toast, and the row still
 * there. That was found twice by accident before a third was found by reading.
 *
 * Which is why the house rule for these tests is written here rather than left
 * to habit: **assert against the database, never against the toast.** A test
 * that clicks delete and checks for a success message reproduces the bug
 * instead of catching it.
 */
export default defineConfig({
  testDir: "./e2e",
  // These drive one shared database. Running them in parallel would have one
  // test's cleanup delete the row another is asserting on.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: process.env.APP_URL ?? "http://localhost:3000",
    // Kept only for failures: a trace per run is slow and nobody opens the
    // green ones.
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: "npm run dev",
    url: process.env.APP_URL ?? "http://localhost:3000",
    // Reuse a dev server that is already up locally; CI has none, so it starts
    // one. Two minutes because a cold Next build is not fast.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
