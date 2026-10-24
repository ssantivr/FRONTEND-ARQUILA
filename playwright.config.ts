import { defineConfig, devices } from "@playwright/test";

const PORT = 5180;

/**
 * Browser tests of the main flows (e2e/). They run against the development server, with the API
 * answered by sample data, so they need no backend.
 *
 * The browser is the one already on the machine: Edge by default, because downloading browsers
 * is not always possible. CI sets E2E_CANAL=chromium and installs it there.
 */
const channel = process.env.E2E_CANAL ?? "msedge";

export default defineConfig({
    testDir: "e2e",
    timeout: 90_000,
    expect: { timeout: 15_000 },
    // Two at a time: more would only queue behind the development server.
    workers: 2,
    fullyParallel: true,
    forbidOnly: process.env.CI !== undefined,
    retries: process.env.CI === undefined ? 0 : 1,
    reporter: process.env.CI === undefined ? "list" : [["list"], ["html", { open: "never" }]],
    use: {
        baseURL: `http://localhost:${PORT}`,
        trace: "retain-on-failure",
        // Movement is checked by `npm run movimiento`; here it would only slow the flows down.
        reducedMotion: "reduce",
    },
    projects: [
        {
            name: "escritorio",
            use: {
                ...devices["Desktop Chrome"],
                channel: channel === "chromium" ? undefined : channel,
                launchOptions: {
                    // WebGL without a graphics card, for the 3D model on CI and headless runs.
                    args: [
                        "--enable-unsafe-swiftshader",
                        "--use-angle=swiftshader",
                        "--ignore-gpu-blocklist",
                    ],
                },
            },
        },
    ],
    webServer: {
        command: `npm run dev -- --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: process.env.CI === undefined,
        timeout: 120_000,
    },
});
