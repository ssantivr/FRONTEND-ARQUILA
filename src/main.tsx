import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import "@fontsource-variable/inter";

import { App } from "./App";
import "./styles/tokens.css";
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
import "./styles/pages/responsive.css";
import "./styles/polish.css";
import "./styles/editor.css";

const container = document.querySelector<HTMLDivElement>("#app");

if (container) {
    createRoot(container).render(
        <StrictMode>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </StrictMode>,
    );
}
