import { useState, type ReactNode } from "react";

import { Icon } from "./Icon";
import { Button } from "./ui/Button";
import { ProgressBar } from "./ui/ProgressBar";
import { Skeleton } from "./ui/Skeleton";

import styles from "./MotionDemos.module.css";

interface Demo {
    name: string;
    /** When the interface uses it and how long it lasts. */
    use: string;
    render: () => ReactNode;
}

const DEMOS: Demo[] = [
    {
        name: "Aparecer subiendo",
        use: "Pantallas, paneles y elementos de una lista. 240 ms.",
        render: () => <span className={`${styles.box} ${styles.rise}`}>Pantalla</span>,
    },
    {
        name: "Crecer desde el 96 %",
        use: "Ventanas, menús, ayudas y la paleta de comandos. 240 ms al entrar, 120 ms al salir.",
        render: () => <span className={`${styles.box} ${styles.scale}`}>Ventana</span>,
    },
    {
        name: "Entrar desde el borde",
        use: "Avisos y el panel del asistente. 240 ms.",
        render: () => <span className={`${styles.box} ${styles.slide}`}>Aviso</span>,
    },
    {
        name: "Lista escalonada",
        use: "Tarjetas y filas: 35 ms entre una y otra, y solo las ocho primeras.",
        render: () => (
            <ul className={`${styles.list} motion-stagger`}>
                {["Sala", "Cocina", "Comedor", "Estudio"].map((room) => (
                    <li key={room} className={styles.box}>
                        {room}
                    </li>
                ))}
            </ul>
        ),
    },
    {
        name: "Sacudida",
        use: "Un campo que no se aceptó, una sola vez. 240 ms.",
        render: () => <span className={`${styles.box} motion-shake`}>Área: -4</span>,
    },
    {
        name: "Guardado",
        use: "El check que sustituye a «Guardando…». 180 ms.",
        render: () => (
            <span className={`${styles.box} ${styles.saved} motion-pop`}>
                <Icon name="check" />
                Guardado
            </span>
        ),
    },
    {
        name: "Barra que se llena",
        use: "Barras de progreso y gráficos, al aparecer. Hasta 600 ms.",
        render: () => <ProgressBar label="Avance de muestra" value={0.72} />,
    },
    {
        name: "Cargando",
        use: "Brillo de los marcadores de carga. Se detiene si reduces el movimiento.",
        render: () => <Skeleton shape="lines" count={2} />,
    },
];

/** One demo of every shared animation, which can be played again. Shown in /design-system. */
export function MotionDemos() {
    const [plays, setPlays] = useState<Record<string, number>>({});

    return (
        <ul className={styles.demos}>
            {DEMOS.map((demo) => (
                <li key={demo.name} className={styles.demo}>
                    <div className={styles.stage} key={plays[demo.name] ?? 0}>
                        {demo.render()}
                    </div>
                    <p className={styles.text}>
                        <strong>{demo.name}</strong>
                        {demo.use}
                    </p>
                    <Button
                        variant="secondary"
                        size="sm"
                        icon="redo"
                        aria-label={`Reproducir: ${demo.name}`}
                        onClick={() =>
                            setPlays((current) => ({
                                ...current,
                                [demo.name]: (current[demo.name] ?? 0) + 1,
                            }))
                        }
                    >
                        Reproducir
                    </Button>
                </li>
            ))}
        </ul>
    );
}
