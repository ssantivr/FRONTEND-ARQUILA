import { render } from "@testing-library/react";
import type { ReactElement } from "react";

import { ModalProvider } from "../components/modal/ModalProvider";

export function renderWithModals(element: ReactElement) {
    return render(element, { wrapper: ModalProvider });
}
