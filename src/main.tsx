import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { ModalProvider } from "./components/modal/ModalProvider";
import "./styles.css";

const container = document.querySelector<HTMLDivElement>("#app");

if (container) {
    createRoot(container).render(
        <StrictMode>
            <ModalProvider>
                <App />
            </ModalProvider>
        </StrictMode>,
    );
}
