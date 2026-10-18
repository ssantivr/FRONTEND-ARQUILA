import { createContext, useContext } from "react";

/**
 * A place in the top bar where the open screen can put its own controls (the project puts its
 * save state and «Asistente»). `null` outside the app shell, as in a test of one screen: the
 * screen then draws those controls where it is.
 */
const TopBarSlotContext = createContext<HTMLElement | null>(null);

export const TopBarSlotProvider = TopBarSlotContext.Provider;

export function useTopBarSlot(): HTMLElement | null {
    return useContext(TopBarSlotContext);
}
