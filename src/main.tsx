import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/viewer.css";
import "./styles/shell.css";
import "./styles/interior.css";
import "./styles/features.css";
import "./styles.css";

const container = document.querySelector<HTMLDivElement>("#app");

if (container) {
    createRoot(container).render(
        <StrictMode>
            <App />
        </StrictMode>,
    );
}
