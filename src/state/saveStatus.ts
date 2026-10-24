import { createContext, useContext } from "react";

export interface SaveStatus {
    /** True while a change of the open project is being sent. */
    pending: boolean;
    /** True when the last change sent was not saved. */
    failed: boolean;
}

const SaveStatusContext = createContext<SaveStatus>({ pending: false, failed: false });

/** Given by the project screen, so the button that sent a change can show how it went. */
export const SaveStatusProvider = SaveStatusContext.Provider;

export function useSaveStatus(): SaveStatus {
    return useContext(SaveStatusContext);
}
