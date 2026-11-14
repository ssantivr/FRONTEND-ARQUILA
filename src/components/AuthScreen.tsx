import type { ReactNode } from "react";

import showcase from "../assets/auth/showcase.jpg";
import { Icon } from "./Icon";
import { Button } from "./ui/Button";
import { ArquilaLogo } from "./ui/Logo";

import styles from "./AuthScreen.module.css";

/** The three pillars, each one something the app does today. */
const PILLARS = [
    {
        icon: "viewer",
        title: "Modelo 3D avanzado",
        text: "Un modelo por proyecto, con cortes, medición y recorrido.",
    },
    {
        icon: "brain",
        title: "IA arquitectónica",
        text: "Un asistente que responde con los datos de tu proyecto.",
    },
    {
        icon: "layers",
        title: "Gestión integral",
        text: "Terrenos, planos, tareas y versiones en un solo lugar.",
    },
] as const;

const VERSION = String(import.meta.env.VITE_APP_VERSION ?? "").replace(/\.0$/, "");

/** Puts the cursor in the first field of the form, for «Acceder» on the showcase. */
function focusForm() {
    document.querySelector<HTMLInputElement>("#auth-form input:not([type='hidden'])")?.focus();
}

/**
 * The screen before the session, always in the dark theme: the form in a glass card on the left
 * and the architectural showcase on the right. The form comes first in the page, so on a phone
 * (and for a screen reader) it is the first thing; the showcase follows it as a band.
 */
export function AuthScreen({ children }: { children: ReactNode }) {
    return (
        <main id="content" className={styles.auth} data-theme="dark" tabIndex={-1}>
            <section className={styles.formSide} aria-labelledby="auth-brand">
                <div className={styles.card}>
                    <span id="auth-brand" className={styles.brand}>
                        <ArquilaLogo size="md" tagline tone="light" />
                    </span>
                    <div id="auth-form" className={styles.body}>
                        {children}
                    </div>
                    <p className={styles.secure}>
                        <Icon name="shield" />
                        Tu información está segura con ARQUILA
                    </p>
                </div>
            </section>
            <section className={styles.showcase} aria-label="Qué es ARQUILA">
                <img className={styles.photo} src={showcase} alt="" decoding="async" />
                <span className={styles.shade} aria-hidden="true" />
                <svg className={styles.blueprint} aria-hidden="true" focusable="false">
                    <defs>
                        <pattern
                            id="auth-grid"
                            width="32"
                            height="32"
                            patternUnits="userSpaceOnUse"
                        >
                            <path d="M32 0H0V32" />
                        </pattern>
                        <linearGradient id="auth-fade" x1="1" y1="0" x2="0.2" y2="0.9">
                            <stop offset="0" stopColor="currentColor" stopOpacity="1" />
                            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                        </linearGradient>
                        <mask id="auth-mask">
                            <rect width="100%" height="100%" fill="url(#auth-fade)" />
                        </mask>
                    </defs>
                    <g mask="url(#auth-mask)">
                        <rect className={styles.grid} width="100%" height="100%" />
                        {/* A house drawn as a wireframe, coming in from the top right corner. */}
                        <svg
                            className={styles.wire}
                            x="40%"
                            y="0"
                            width="60%"
                            height="72%"
                            viewBox="-90 20 520 380"
                            preserveAspectRatio="xMaxYMin meet"
                        >
                            <path d="M0 150L170 90L340 150V330L170 390L0 330Z" />
                            <path d="M170 90V390M0 150L170 210L340 150M170 210V390" />
                            <path d="M0 240L170 300L340 240M60 172V262M110 190V280" />
                            <path d="M-80 178L0 150M340 150L420 178M170 30V90" />
                        </svg>
                    </g>
                </svg>
                <div className={styles.overlay}>
                    <div className={styles.header}>
                        <Button
                            variant="secondary"
                            iconEnd="arrowRight"
                            className={styles.access}
                            onClick={focusForm}
                        >
                            Acceder
                        </Button>
                    </div>
                    <div className={styles.claim}>
                        <h2>
                            Construye tus ideas. <span>Visualiza el futuro.</span>
                        </h2>
                        <p>
                            El espacio inteligente donde tus planos se convierten en experiencias
                            arquitectónicas tridimensionales.
                        </p>
                    </div>
                    <ul className={styles.pillars}>
                        {PILLARS.map((pillar) => (
                            <li key={pillar.title}>
                                <Icon name={pillar.icon} />
                                <span>
                                    <strong>{pillar.title}</strong>
                                    {pillar.text}
                                </span>
                            </li>
                        ))}
                    </ul>
                    {VERSION !== "" && <p className={styles.version}>ARQUILA v{VERSION}</p>}
                </div>
            </section>
        </main>
    );
}
