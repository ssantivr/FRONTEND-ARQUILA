import { useState } from "react";

import { AsyncStatus } from "../components/AsyncStatus";
import { StatusBadge } from "../components/Badge";
import { MetricCard } from "../components/MetricCard";
import { Modal } from "../components/Modal";
import { Panel } from "../components/Panel";
import { ProjectCard } from "../components/ProjectCard";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Field } from "../components/ui/Field";
import { Menu } from "../components/ui/Menu";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Tabs } from "../components/ui/Tabs";
import { showToast } from "../state/toasts";
import type { Project } from "../types/api";

const COLORS = [
    "--bg",
    "--panel",
    "--panel-raised",
    "--border",
    "--border-strong",
    "--text",
    "--text-secondary",
    "--accent",
    "--primary",
    "--lime",
    "--forest",
    "--forest-raised",
    "--success",
    "--warning",
    "--error",
];

const TABS = [
    { id: "first", label: "Terreno" },
    { id: "second", label: "Planos" },
    { id: "third", label: "Modelo 3D" },
] as const;

/** Sample data for the showcase only; this page never ships in the production build. */
const SAMPLE_PROJECT: Project = {
    id: 2,
    owner_id: 0,
    name: "Proyecto de muestra",
    description: null,
    location: "Ubicación de muestra",
    status: "active",
    created_at: "2026-10-01T12:00:00Z",
    updated_at: "2026-10-04T12:00:00Z",
};

function Showcase() {
    const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("first");
    const [name, setName] = useState("");
    const [open, setOpen] = useState(false);
    const [picked, setPicked] = useState("Ninguna todavía");

    return (
        <>
            <Panel title="Color">
                <ul className="ds-swatches">
                    {COLORS.map((token) => (
                        <li key={token}>
                            <span className="ds-swatch" style={{ background: `var(${token})` }} />
                            <code>{token}</code>
                        </li>
                    ))}
                </ul>
            </Panel>

            <Panel title="Tipografía">
                <h1 className="ds-h1">Título de página</h1>
                <h2>Título de panel</h2>
                <p>Texto general de la interfaz, a 15 px.</p>
                <p className="message">Texto secundario para aclaraciones.</p>
                <p className="numeric">1.234,56 m² · cifras tabulares</p>
            </Panel>

            <Panel title="Botones">
                <div className="ds-row">
                    <Button>Primario</Button>
                    <Button variant="secondary">Secundario</Button>
                    <Button variant="tertiary">Terciario</Button>
                    <Button variant="danger">Destructivo</Button>
                    <Button disabled>Deshabilitado</Button>
                    <Button loading>Guardando</Button>
                </div>
            </Panel>

            <Panel title="Campos y selectores">
                <div className="ds-grid">
                    <Field label="Nombre" hint="Como aparecerá en la lista de proyectos.">
                        <input value={name} onChange={(event) => setName(event.target.value)} />
                    </Field>
                    <Field label="Correo" error="Escribe un correo válido.">
                        <input type="email" defaultValue="ana@" />
                    </Field>
                    <Field label="Estado">
                        <select defaultValue="active">
                            <option value="draft">Borrador</option>
                            <option value="active">Activo</option>
                            <option value="archived">Archivado</option>
                        </select>
                    </Field>
                    <Field label="Descripción">
                        <textarea rows={2} defaultValue="Vivienda de dos niveles." />
                    </Field>
                </div>
                <label className="checkbox">
                    <input type="checkbox" defaultChecked />
                    Casilla de verificación
                </label>
                <label>
                    Control deslizante
                    <input type="range" defaultValue={40} />
                </label>
            </Panel>

            <Panel title="Tarjetas e indicadores">
                <div className="ds-grid">
                    <ProjectCard project={SAMPLE_PROJECT} onOpen={() => undefined} />
                    <MetricCard label="Indicador" value="128" detail="Detalle de la cifra" />
                </div>
                <div className="ds-row">
                    <StatusBadge status="draft" />
                    <StatusBadge status="active" />
                    <StatusBadge status="archived" />
                </div>
            </Panel>

            <Panel title="Pestañas, menú y tooltip">
                <Tabs label="Pestañas de muestra" items={TABS} current={tab} onChange={setTab} />
                <div className="ds-row">
                    <Menu
                        label="Acciones de muestra"
                        items={[
                            { label: "Abrir", onSelect: () => setPicked("Abrir") },
                            { label: "Archivar", onSelect: () => setPicked("Archivar") },
                            {
                                label: "Eliminar",
                                danger: true,
                                onSelect: () => setPicked("Eliminar"),
                            },
                        ]}
                    />
                    <span role="status">Opción elegida: {picked}</span>
                    <Button variant="secondary" data-tip="Texto de ayuda al pasar el cursor">
                        Con tooltip
                    </Button>
                </div>
            </Panel>

            <Panel title="Modal y avisos">
                <div className="ds-row">
                    <Button variant="secondary" onClick={() => setOpen(true)}>
                        Abrir modal
                    </Button>
                    <Button variant="secondary" onClick={() => showToast("Aviso de muestra.")}>
                        Mostrar aviso
                    </Button>
                </div>
                {open && (
                    <Modal title="Ventana modal" onClose={() => setOpen(false)}>
                        <p>Contenido de la ventana. Se cierra con Escape o con el botón.</p>
                    </Modal>
                )}
            </Panel>

            <Panel title="Progreso y estados">
                <div className="ds-stack">
                    <ProgressBar label="Avance de muestra" value={0.62} />
                    <AsyncStatus loading error={null} isEmpty emptyText="" />
                    <EmptyState
                        text="Estado vacío con una acción."
                        action={<Button variant="secondary">Crear el primero</Button>}
                    />
                    <AsyncStatus
                        loading={false}
                        error="No se pudo conectar con el servidor."
                        isEmpty
                        emptyText=""
                        onRetry={() => undefined}
                    />
                </div>
            </Panel>

            <Panel title="Tabla">
                <table>
                    <thead>
                        <tr>
                            <th>Elemento</th>
                            <th className="numeric">Cantidad</th>
                            <th className="numeric">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td data-label="Elemento">Fila de muestra</td>
                            <td data-label="Cantidad" className="numeric">
                                12 u
                            </td>
                            <td data-label="Subtotal" className="numeric">
                                48,00
                            </td>
                        </tr>
                    </tbody>
                </table>
            </Panel>
        </>
    );
}

/** Every shared component in both themes. Only reachable in development, at `/design-system`. */
export function DesignSystemPage() {
    return (
        <div className="ds">
            {(["light", "dark"] as const).map((theme) => (
                <section key={theme} className="ds-theme" data-theme={theme}>
                    <h2 className="ds-title">{theme === "light" ? "Tema claro" : "Tema oscuro"}</h2>
                    <Showcase />
                </section>
            ))}
        </div>
    );
}
