import { ModalFrame, type ModalFrameProps } from "./ModalFrame";

import styles from "./Drawer.module.css";

export type DrawerSide = "right" | "left" | "bottom";

interface DrawerProps extends Omit<ModalFrameProps, "container"> {
    /** Edge it slides in from. `bottom` is the sheet of small screens. */
    side?: DrawerSide;
}

/** A side panel over the page: navigation, filters or properties on small screens. */
export function Drawer({ side = "right", ...frame }: DrawerProps) {
    return (
        <ModalFrame
            {...frame}
            classes={{
                overlay: styles.overlay,
                content: `${styles.drawer} ${styles[side]}`,
                header: styles.header,
                title: styles.title,
                actions: styles.actions,
                body: styles.body,
            }}
        />
    );
}
