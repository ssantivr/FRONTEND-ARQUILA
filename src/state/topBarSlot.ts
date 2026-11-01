import { createContext, useContext } from "react";

/**
 * A place in the top bar where the open screen can put its own controls (the project puts its
 * save state and «Asistente»). `null` outside the app shell, as in a test of one screen: the
 * screen then draws those controls where it is.
 */
const TopBarSlotContext = createContext<HTMLElement | null>(null);

export const TopBarSlotProvider = TopBarSlotContext.Provider;

/** The place of the trail in the top bar, for the screen that knows more of the path. */
const TopBarCrumbsContext = createContext<HTMLElement | null>(null);

export const TopBarCrumbsProvider = TopBarCrumbsContext.Provider;

export function useTopBarCrumbs(): HTMLElement | null {
    return useContext(TopBarCrumbsContext);
}

export function useTopBarSlot(): HTMLElement | null {
    return useContext(TopBarSlotContext);
}
