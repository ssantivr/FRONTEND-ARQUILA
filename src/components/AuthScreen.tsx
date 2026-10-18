import type { ReactNode } from "react";

import { setThemePreference, useThemePreference } from "../state/theme";
import { BrandMark } from "./BrandMark";
import { Icon } from "./Icon";
import { RenderImage } from "./RenderImage";
import { THEME_OPTIONS } from "./TopBar";
import { SegmentedControl } from "./ui/SegmentedControl";

import styles from "./AuthScreen.module.css";

/** What the app really does, said under the claim. Each line is a screen that exists. */
const FEATURES = [
    {
        icon: "viewer",
        title: "Modelo 3D",
        text: "Se arma con los terrenos, planos y cuartos del proyecto.",
    },
    {
        icon: "plans",
        title: "Planos con cotas",
        text: "Plantas, fachadas e implantación, descargables en SVG.",
    },
    {
        icon: "materials",
        title: "Costos",
        text: "Materiales por proyecto y su costo por categoría.",
    },
] as const;

/**
 * The screen before the session: the form on one side and the render with the claim on the
 * other. The form comes first in the page, so on a phone (and for a screen reader) it is the
 * first thing; on a wide screen the picture is laid out to its left.
 */
export function AuthScreen({ children }: { children: ReactNode }) {
    const theme = useThemePreference();

    return (
        <main id="content" className={styles.auth} tabIndex={-1}>
            <section className={styles.formSide} aria-labelledby="auth-brand">
                <div className={styles.top}>
                    <span id="auth-brand" className={styles.brand}>
                        <BrandMark size={26} />
                        ARQUILA
                    </span>
                    <SegmentedControl
                        label="Tema"
                        iconOnly
                        size="sm"
                        options={THEME_OPTIONS}
                        value={theme}
                        onChange={setThemePreference}
                    />
                </div>
                <div className={styles.body}>{children}</div>
            </section>
            <section className={styles.visual} data-theme="dark" aria-label="Qué es ARQUILA">
                <div className={styles.picture}>
                    <RenderImage />
                </div>
                <div className={styles.claim}>
                    <h2>Diseña, organiza y visualiza tu arquitectura.</h2>
                    <p>
                        Proyectos, terrenos, planos, materiales y modelo 3D en un solo espacio de
                        trabajo.
                    </p>
                    <ul className={styles.features}>
                        {FEATURES.map((feature) => (
                            <li key={feature.title}>
                                <Icon name={feature.icon} />
                                <span>
                                    <strong>{feature.title}</strong>
                                    {feature.text}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>
        </main>
    );
}
