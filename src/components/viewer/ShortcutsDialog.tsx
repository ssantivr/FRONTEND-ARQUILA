import { Dialog } from "../ui/Dialog";
import { GLOBAL_SHORTCUTS, VIEWER_SHORTCUTS } from "./shortcuts";
import styles from "./ShortcutsDialog.module.css";

function ShortcutList({ title, items }: { title: string; items: typeof VIEWER_SHORTCUTS }) {
    return (
        <section>
            <h3 className={styles.heading}>{title}</h3>
            <dl className={styles.list}>
                {items.map((item) => (
                    <div key={item.action} className={styles.row}>
                        <dt>
                            {item.keys.map((key) => (
                                <kbd key={key} className={styles.key}>
                                    {key}
                                </kbd>
                            ))}
                        </dt>
                        <dd>{item.action}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

interface ShortcutsDialogProps {
    /** Where to draw the window; the stage itself while the viewer is in full screen. */
    container?: HTMLElement | null;
    onClose: () => void;
}

/** The help window of the 3D viewer, opened with «?». */
export function ShortcutsDialog({ container, onClose }: ShortcutsDialogProps) {
    return (
        <Dialog title="Atajos de teclado" size="compact" container={container} onClose={onClose}>
            <div className={styles.groups}>
                <ShortcutList title="En el modelo 3D" items={VIEWER_SHORTCUTS} />
                <ShortcutList title="En toda la aplicación" items={GLOBAL_SHORTCUTS} />
                <p className={styles.note}>
                    Con el ratón: un clic selecciona, doble clic acerca la cámara, arrastrar gira el
                    modelo y la rueda acerca o aleja. En pantallas táctiles, un dedo gira y dos
                    acercan o desplazan.
                </p>
            </div>
        </Dialog>
    );
}
