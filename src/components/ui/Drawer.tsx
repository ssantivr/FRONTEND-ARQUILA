import * as RadixDialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

import { useAnimatedClose } from "../../hooks/useAnimatedClose";

import styles from "./Drawer.module.css";

export type DrawerSide = "right" | "left" | "bottom";

interface DrawerProps {
    title: string;
    /** Edge it slides in from. `bottom` is the sheet of small screens. */
    side?: DrawerSide;
    /** Extra controls shown in the header, before «Cerrar». */
    actions?: ReactNode;
    onClose: () => void;
    children: ReactNode;
}

/**
 * A side panel over the page: navigation, filters or properties on small screens. Like `Dialog`,
 * Radix keeps the focus inside, closes it with Escape or a click outside and gives the focus back.
 */
export function Drawer({ title, side = "right", actions, onClose, children }: DrawerProps) {
    const closing = useAnimatedClose<HTMLDivElement>(onClose);

    return (
        <RadixDialog.Root
            open={closing.open}
            onOpenChange={(open) => {
                if (!open) {
                    closing.requestClose();
                }
            }}
        >
            <RadixDialog.Portal>
                <RadixDialog.Overlay className={styles.overlay} />
                <RadixDialog.Content
                    ref={closing.ref}
                    onAnimationEnd={closing.onAnimationEnd}
                    className={`${styles.drawer} ${styles[side]}`}
                    aria-describedby={undefined}
                >
                    <header className={styles.header}>
                        <RadixDialog.Title className={styles.title}>{title}</RadixDialog.Title>
                        <div className={styles.actions}>
                            {actions}
                            <RadixDialog.Close className="button-secondary">
                                Cerrar
                            </RadixDialog.Close>
                        </div>
                    </header>
                    <div className={styles.body}>{children}</div>
                </RadixDialog.Content>
            </RadixDialog.Portal>
        </RadixDialog.Root>
    );
}
