import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";

import "./styles/tokens.css";
import "./styles/index.css";
import "./styles/pages/tour.css";

// The app is imported after the global sheets: the CSS Modules of its components then come later
// in the bundle, so at equal specificity a component's own rule wins over a global one.
import { App } from "./App";
import { BrandIntro } from "./components/BrandIntro";

const container = document.querySelector<HTMLDivElement>("#app");

// `npm run demo` answers the API in the browser before the first request. The mode is a
// constant of the build, so in any other mode this import is dropped with the branch.
const ready =
    import.meta.env.MODE === "demo"
        ? import("./demo/start").then(({ startDemo }) => startDemo())
        : Promise.resolve();

void ready.then(render);

function render() {
    if (!container) {
        return;
    }

    createRoot(container).render(
        <StrictMode>
            {/* Without its own transitions the router updates at once, which a view transition
                needs: the browser takes its picture of the new screen right after the update. */}
            <BrowserRouter useTransitions={false}>
                <App />
                <BrandIntro />
            </BrowserRouter>
        </StrictMode>,
    );
}
