import * as RadixDialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

import { useAnimatedClose } from "../../hooks/useAnimatedClose";
import { Button } from "./Button";

interface ModalFrameClasses {
    overlay: string;
    content: string;
    header: string;
    title: string;
    actions: string;
    body: string;
}

export interface ModalFrameProps {
    title: string;
    /** Extra controls shown in the header, before «Cerrar». */
    actions?: ReactNode;
    /** Element to draw it in; the page by default. Needed inside a full-screen element. */
    container?: HTMLElement | null;
    onClose: () => void;
    children: ReactNode;
}

/**
 * What `Dialog` and `Drawer` share. Radix keeps the focus inside while it is open, closes it with
 * Escape or a click outside and gives the focus back to the control that opened it.
 */
export function ModalFrame({
    title,
    actions,
    container,
    onClose,
    classes,
    children,
}: ModalFrameProps & { classes: ModalFrameClasses }) {
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
            <RadixDialog.Portal container={container}>
                <RadixDialog.Overlay className={classes.overlay} />
                <RadixDialog.Content
                    ref={closing.ref}
                    onAnimationEnd={closing.onAnimationEnd}
                    className={classes.content}
                    aria-describedby={undefined}
                >
                    <header className={classes.header}>
                        <RadixDialog.Title className={classes.title}>{title}</RadixDialog.Title>
                        <div className={classes.actions}>
                            {actions}
                            <RadixDialog.Close asChild>
                                <Button variant="secondary" size="sm" icon="close">
                                    Cerrar
                                </Button>
                            </RadixDialog.Close>
                        </div>
                    </header>
                    <div className={classes.body}>{children}</div>
                </RadixDialog.Content>
            </RadixDialog.Portal>
        </RadixDialog.Root>
    );
}
