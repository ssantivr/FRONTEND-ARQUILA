import { ModalFrame, type ModalFrameProps } from "./ModalFrame";

import styles from "./Dialog.module.css";

interface DialogProps extends ModalFrameProps {
    /** `viewer` fills the window to show a file or a sample; `compact` wraps a short text. */
    size?: "viewer" | "compact";
}

/** A modal window. */
export function Dialog({ size = "viewer", ...frame }: DialogProps) {
    return (
        <ModalFrame
            {...frame}
            classes={{
                overlay: styles.overlay,
                content: `${styles.dialog} ${styles[size]} modal`,
                header: styles.header,
                title: styles.title,
                actions: styles.actions,
                body: styles.body,
            }}
        />
    );
}
