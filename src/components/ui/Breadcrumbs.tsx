import { Icon } from "../Icon";
import styles from "./Breadcrumbs.module.css";

export interface Crumb {
    label: string;
    /** Where the crumb leads. The last one is the current page and has no action. */
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
                            {item.onSelect !== undefined && !last ? (
                                <button
                                    type="button"
                                    className={styles.link}
                                    onClick={item.onSelect}
                                >
                                    {item.label}
                                </button>
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
