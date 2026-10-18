import { useState } from "react";

import { AsyncStatus } from "../components/AsyncStatus";
import { MotionDemos } from "../components/MotionDemos";
import { StatusBadge } from "../components/ui/Badge";
import { MetricCard } from "../components/ui/MetricCard";
import { Dialog } from "../components/ui/Dialog";
import { Panel } from "../components/ui/Panel";
import { ProjectCard } from "../components/ProjectCard";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { DataTable } from "../components/ui/DataTable";
import { Drawer } from "../components/ui/Drawer";
import { FilterBar } from "../components/ui/FilterBar";
import { SaveIndicator, type SaveState } from "../components/ui/SaveIndicator";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { Spinner } from "../components/ui/Spinner";
import { Switch } from "../components/ui/Switch";
import { Input, Select } from "../components/ui/Input";
import { Skeleton } from "../components/ui/Skeleton";
import { Tooltip } from "../components/ui/Tooltip";
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

/** Rows of the sample table; like the sample project, they only exist on this page. */
const SAMPLE_ROWS = [
    { id: 1, name: "Lote de muestra A", area: 480 },
    { id: 2, name: "Lote de muestra B", area: null },
    { id: 3, name: "Lote de muestra C", area: 212.5 },
];

const SAVE_STATES: SaveState[] = ["idle", "saving", "saved", "error"];

function Showcase() {
    const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("first");
    const [name, setName] = useState("");
    const [open, setOpen] = useState(false);
    const [picked, setPicked] = useState("Ninguna todavía");
    const [view, setView] = useState<"grid" | "rows">("grid");
    const [compact, setCompact] = useState(false);
    const [drawer, setDrawer] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [search, setSearch] = useState("");
    const rows = SAMPLE_ROWS.filter((row) =>
        row.name.toLowerCase().includes(search.trim().toLowerCase()),
    );

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
                    <Tooltip text="Texto de ayuda" shortcut="F">
                        <Button variant="secondary">Con tooltip</Button>
                    </Tooltip>
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
                    <Dialog title="Ventana modal" size="compact" onClose={() => setOpen(false)}>
                        <p>Contenido de la ventana. Se cierra con Escape o con el botón.</p>
                    </Dialog>
                )}
            </Panel>

            <Panel title="Selección segmentada, interruptor y carga">
                <div className="ds-stack">
                    <div className="ds-row">
                        <SegmentedControl
                            label="Vista"
                            options={[
                                { value: "grid", label: "Cuadrícula", icon: "grid" },
                                { value: "rows", label: "Lista", icon: "rows" },
                            ]}
                            value={view}
                            onChange={setView}
                        />
                        <SegmentedControl
                            label="Vista (solo iconos)"
                            iconOnly
                            size="sm"
                            options={[
                                { value: "grid", label: "Cuadrícula", icon: "grid" },
                                { value: "rows", label: "Lista", icon: "rows" },
                            ]}
                            value={view}
                            onChange={setView}
                        />
                        <Spinner size="sm" />
                        <Spinner label="Cargando la muestra…" />
                        <Spinner size="lg" />
                    </div>
                    <Switch
                        label="Interruptor de muestra"
                        description="Se aplica al momento, sin botón de guardar."
                        checked={compact}
                        onChange={(event) => setCompact(event.target.checked)}
                    />
                    <div className="ds-row">
                        {SAVE_STATES.map((state) => (
                            <span key={state} className="ds-row">
                                <code>{state}</code>
                                <SaveIndicator state={state} />
                            </span>
                        ))}
                    </div>
                </div>
            </Panel>

            <Panel title="Cajón y confirmación">
                <div className="ds-row">
                    <Button variant="secondary" onClick={() => setDrawer(true)}>
                        Abrir cajón
                    </Button>
                    <Button variant="danger" onClick={() => setConfirming(true)}>
                        Eliminar…
                    </Button>
                </div>
                {drawer && (
                    <Drawer title="Cajón lateral" onClose={() => setDrawer(false)}>
                        <p>Paneles de filtros o de propiedades en pantallas pequeñas.</p>
                    </Drawer>
                )}
                {confirming && (
                    <ConfirmDialog
                        title="¿Eliminar la muestra?"
                        confirmLabel="Eliminar"
                        danger
                        onConfirm={() => {
                            setConfirming(false);
                            showToast("Confirmación de muestra aceptada.");
                        }}
                        onCancel={() => setConfirming(false)}
                    >
                        <p>Abre con el foco en «Cancelar». No se elimina nada real.</p>
                    </ConfirmDialog>
                )}
            </Panel>

            <Panel title="Filtros y tabla ordenable">
                <FilterBar
                    searchLabel="Buscar en la muestra"
                    search={search}
                    onSearch={setSearch}
                    resultText={`${rows.length} de ${SAMPLE_ROWS.length} filas`}
                    active={search !== ""}
                    onClear={() => setSearch("")}
                />
                <DataTable
                    caption="Tabla de muestra"
                    rows={rows}
                    rowKey={(row) => row.id}
                    empty="Ninguna fila coincide con la búsqueda."
                    columns={[
                        {
                            id: "name",
                            header: "Nombre",
                            cell: (row) => row.name,
                            sortValue: (row) => row.name,
                        },
                        {
                            id: "area",
                            header: "Área",
                            numeric: true,
                            cell: (row) => (row.area === null ? "Sin registrar" : `${row.area} m²`),
                            sortValue: (row) => row.area,
                        },
                    ]}
                />
            </Panel>

            <Panel title="Tarjeta, campos y carga">
                <div className="ds-stack">
                    <Card as="article">
                        <strong>Tarjeta</strong>
                        <p className="message">
                            Superficie con el radio, el borde y la sombra de reposo.
                        </p>
                    </Card>
                    <Input label="Nombre del lote" hint="Como aparece en la escritura." />
                    <Select label="Escala" defaultValue="100">
                        <option value="50">1:50</option>
                        <option value="100">1:100</option>
                        <option value="200">1:200</option>
                    </Select>
                    <Skeleton shape="rows" count={3} />
                </div>
            </Panel>

            <Panel title="Movimiento">
                <p className="message">
                    Todas las animaciones salen de <code>styles/motion.css</code>. Cambia de tema,
                    abre la ventana o el aviso de arriba para ver las demás.
                </p>
                <MotionDemos />
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
