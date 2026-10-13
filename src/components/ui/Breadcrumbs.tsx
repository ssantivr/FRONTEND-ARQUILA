import { Icon } from "../Icon";
import styles from "./Breadcrumbs.module.css";

export interface Crumb {
    label: string;
    /** Address of the crumb, so it can be opened in another tab. The last one has none. */
    href?: string;
    /** Navigates inside the app on a plain click. */
    onSelect?: () => void;
}

/** The path from the module to what is open, such as «Proyectos › Casa Mirador › Modelo 3D». */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
    return (
        <nav className={styles.trail} aria-label="Migas de pan">
            <ol>
                {items.map((item, index) => {
                    const last = index === items.length - 1;

                    return (
                        <li key={`${index}-${item.label}`}>
                            {item.href !== undefined && !last ? (
                                <a
                                    className={styles.link}
                                    href={item.href}
                                    onClick={(event) => {
                                        // A modified click (new tab, new window) is left to the browser.
                                        if (
                                            item.onSelect !== undefined &&
                                            !event.ctrlKey &&
                                            !event.metaKey &&
                                            !event.shiftKey
                                        ) {
                                            event.preventDefault();
                                            item.onSelect();
                                        }
                                    }}
                                >
                                    {item.label}
                                </a>
                            ) : (
                                <span
                                    className={styles.current}
                                    aria-current={last ? "page" : undefined}
                                >
                                    {item.label}
                                </span>
                            )}
                            {!last && <Icon name="chevronRight" />}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
