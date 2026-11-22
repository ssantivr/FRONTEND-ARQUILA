import { createContext, useContext } from "react";

/** What the project page knows about the save in progress, for the dialog that started it. */
export const SaveStateContext = createContext<{ pending: boolean; error: string | null }>({
    pending: false,
    error: null,
});

export function useSaveState() {
    return useContext(SaveStateContext);
}
