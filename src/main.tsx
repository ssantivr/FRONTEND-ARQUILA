import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";

import "./styles/tokens.css";
import "./styles/motion.css";
import "./styles/base.css";
import "./styles/viewer.css";
import "./styles/shell.css";
import "./styles/interior.css";
import "./styles/features.css";
import "./styles/hierarchy.css";
import "./styles/states.css";
import "./styles/media.css";
import "./styles/ui.css";
import "./styles/design-system.css";
import "./styles/projects.css";
import "./styles/terrains.css";
import "./styles/materials.css";
import "./styles/plans.css";
import "./styles/shell-phone.css";
import "./styles/identity.css";
import "./styles/auth.css";
import "./styles/home.css";
import "./styles/pages/band.css";
import "./styles/pages/head.css";
import "./styles/pages/projects.css";
import "./styles/pages/terrains.css";
import "./styles/pages/materials.css";
import "./styles/pages/settings.css";
import "./styles/pages/home.css";
import "./styles/pages/auth.css";
import "./styles/pages/assistant.css";
import "./styles/pages/studio.css";
import "./styles/pages/responsive.css";
import "./styles/polish.css";
import "./styles/editor.css";
import "./styles/rich.css";
import "./styles/numbers.css";
import "./styles/navigation.css";

// The app is imported after the global sheets: the CSS Modules of its components then come later
// in the bundle, so at equal specificity a component's own rule wins over a global one.
import { App } from "./App";

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
            </BrowserRouter>
        </StrictMode>,
    );
}
