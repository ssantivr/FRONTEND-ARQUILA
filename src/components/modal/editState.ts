import { createContext, useContext } from "react";

/** What a field inside an update dialog can tell it. Null outside one. */
export const EditContext = createContext<{
    noteChange: (label: string) => void;
    close: () => void;
} | null>(null);

export function useEditState() {
    return useContext(EditContext);
}
