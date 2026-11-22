import type { ModalApi } from "./modalContext";

interface DeleteOptions {
    /** With its article: "el plano", "la elevación". */
    what: string;
    name: string;
    /** False when "Deshacer" cannot bring it back. */
    undoable: boolean;
    impact?: string[];
    requireText?: string;
    action: () => Promise<unknown>;
}

export function confirmDelete(
    modal: ModalApi,
    { what, name, undoable, impact, requireText, action }: DeleteOptions,
): Promise<boolean> {
    return modal.confirm({
        title: `Eliminar ${what}`,
        body: `¿Eliminar ${what} «${name}»? ${
            undoable ? "Podrás recuperarlo con «Deshacer»." : "No se puede deshacer."
        }`,
        tone: "danger",
        confirmLabel: "Eliminar",
        impact,
        requireText,
        action,
    });
}

/** The dialog already did the request: the section only has to reload. */
export const alreadyDone = () => Promise.resolve();
