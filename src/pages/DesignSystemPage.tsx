import { useState, type ReactNode } from "react";

import { AsyncStatus } from "../components/AsyncStatus";
import { MotionDemos } from "../components/MotionDemos";
import { ProjectCard } from "../components/ProjectCard";
import { StatusBadge } from "../components/ui/Badge";
import { BlueprintGrid, CornerMarks, DimensionLine, GridAxes } from "../components/ui/Blueprint";
import { Button } from "../components/ui/Button";
import {
    CameraControls,
    type CameraProjection,
    type CameraView,
} from "../components/ui/CameraControls";
import { Card } from "../components/ui/Card";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { ContextMenu } from "../components/ui/ContextMenu";
import { DataTable } from "../components/ui/DataTable";
import { Dialog } from "../components/ui/Dialog";
import { Drawer } from "../components/ui/Drawer";
import { EmptyState, type EmptyArt } from "../components/ui/EmptyState";
import { FilterBar } from "../components/ui/FilterBar";
import { IconButton } from "../components/ui/IconButton";
import { Checkbox, Input, PasswordInput, Select, Textarea } from "../components/ui/Input";
import { Kbd } from "../components/ui/Kbd";
import { Loader } from "../components/ui/Loader";
import { Logo, LogoMark } from "../components/ui/Logo";
import { MaterialPicker } from "../components/ui/MaterialPicker";
import { Menu } from "../components/ui/Menu";
import { MetricCard } from "../components/ui/MetricCard";
import { Panel } from "../components/ui/Panel";
import { ProgressBar } from "../components/ui/ProgressBar";
import {
    PropertyField,
    PropertyPanel,
    PropertyRow,
    PropertySection,
} from "../components/ui/PropertyPanel";
import { Quantity } from "../components/ui/Quantity";
import { Range } from "../components/ui/Range";
import { SaveIndicator, type SaveState } from "../components/ui/SaveIndicator";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { Skeleton } from "../components/ui/Skeleton";
import { Spinner } from "../components/ui/Spinner";
import { Switch } from "../components/ui/Switch";
import { Tabs } from "../components/ui/Tabs";
import { DerivedTag, Tag, type TagTone } from "../components/ui/Tag";
import { Tooltip } from "../components/ui/Tooltip";
import { showToast } from "../state/toasts";
import type { Project } from "../types/api";

import styles from "./DesignSystemPage.module.css";

/*
 * Everything on this page is sample content: it is only reachable in development, at
 * `/design-system`, and the production build leaves it out. No figure here is a project's.
 */

const COLOR_GROUPS: { title: string; tokens: string[] }[] = [
    {
        title: "Superficies",
        tokens: [
            "--color-bg",
            "--color-surface",
            "--color-surface-raised",
            "--color-surface-sunken",
            "--color-border",
            "--color-border-strong",
        ],
    },
    {
        title: "Texto e interacción",
        tokens: [
            "--color-text",
            "--color-text-secondary",
            "--color-action",
            "--color-accent",
            "--color-on-accent",
            "--color-selection",
        ],
    },
    {
        title: "Estados",
        tokens: ["--color-success", "--color-warning", "--color-danger", "--color-info"],
    },
    {
        title: "Marca (igual en los dos temas)",
        tokens: ["--brand-forest", "--brand-forest-raised", "--brand-lime", "--brand-face-left"],
    },
];

const TABS = [
    { id: "terrain", label: "Terreno" },
    { id: "plans", label: "Planos", count: 3 },
    { id: "model", label: "Modelo 3D" },
] as const;

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

const SAMPLE_ROWS = [
    { id: 1, name: "Lote de muestra 10", area: 480 },
    { id: 2, name: "Lote de muestra 2", area: null },
    { id: 3, name: "Lote de muestra 1", area: 212.5 },
];

const SAVE_STATES: SaveState[] = ["idle", "saving", "saved", "error"];
const TONES: TagTone[] = ["neutral", "accent", "success", "warning", "danger", "info"];
const ARTS: EmptyArt[] = ["plan", "section", "volume", "site"];

const SWATCHES = [
    { id: "concrete", label: "Hormigón", tone: "#9aa39b" },
    { id: "oak", label: "Roble", tone: "#a8794f", detail: "Muestra" },
    { id: "slate", label: "Pizarra", tone: "#3e4a45" },
    { id: "lime", label: "Estuco", tone: "#e9eee6" },
] as const;

type SwatchId = (typeof SWATCHES)[number]["id"];

function Block({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
    return (
        <Panel title={title} description={note}>
            <div className={styles.stack}>{children}</div>
        </Panel>
    );
}

function Row({ children }: { children: ReactNode }) {
    return <div className={styles.row}>{children}</div>;
}

function Showcase() {
    const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("terrain");
    const [view, setView] = useState<"grid" | "rows" | "timeline">("grid");
    const [cameraView, setCameraView] = useState<CameraView | null>("iso");
    const [projection, setProjection] = useState<CameraProjection>("perspective");
    const [swatch, setSwatch] = useState<SwatchId>("concrete");
    const [width, setWidth] = useState(4.2);
    const [exposure, setExposure] = useState(1);
    const [on, setOn] = useState(true);
    const [dialog, setDialog] = useState(false);
    const [drawer, setDrawer] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [picked, setPicked] = useState("ninguna");
    const [search, setSearch] = useState("");
    const rows = SAMPLE_ROWS.filter((row) =>
        row.name.toLowerCase().includes(search.trim().toLowerCase()),
    );

    return (
        <div className={styles.blocks}>
            <Block title="Identidad" note="Logotipo isométrico y motivo de plano.">
                <Row>
                    <Logo size="lg" tagline />
                    <Logo />
                    <Logo size="sm" />
                    <LogoMark size={20} />
                </Row>
                <div className={styles.sheet}>
                    <BlueprintGrid />
                    <CornerMarks />
                    <div className={styles.sheetBody}>
                        <GridAxes labels={["A", "B", "C", "D"]} />
                        <DimensionLine label="12,40 m" />
                        <DimensionLine />
                    </div>
                </div>
            </Block>

            <Block
                title="Color"
                note="Tokens de src/styles/tokens.css. npm run contraste los valida."
            >
                {COLOR_GROUPS.map((group) => (
                    <div key={group.title} className={styles.colorGroup}>
                        <p className={styles.label}>{group.title}</p>
                        <ul className={styles.swatches}>
                            {group.tokens.map((token) => (
                                <li key={token}>
                                    <span
                                        className={styles.swatch}
                                        style={{ background: `var(${token})` }}
                                        aria-hidden="true"
                                    />
                                    <code>{token}</code>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </Block>

            <Block title="Tipografía y cifras">
                <p className={styles.label}>Etiqueta en mayúsculas</p>
                <p className={styles.display}>Tu visión, construida</p>
                <h3>Título de panel</h3>
                <p>Texto general de la interfaz, a 14 px, para leer sin esfuerzo.</p>
                <p className={styles.muted}>Texto secundario para aclaraciones.</p>
                <Row>
                    <Quantity value="233,6" unit="m²" size="xl" derived />
                    <Quantity value="12,40" unit="m" />
                    <Quantity value="35" unit="°" />
                    <Quantity value={null} unit="m²" missing="Sin registrar" />
                    <DerivedTag />
                </Row>
            </Block>

            <Block title="Botones">
                <Row>
                    <Button iconEnd="arrowRight">Primario</Button>
                    <Button variant="secondary" icon="plus">
                        Secundario
                    </Button>
                    <Button variant="tertiary">Terciario</Button>
                    <Button variant="danger" icon="trash">
                        Destructivo
                    </Button>
                </Row>
                <Row>
                    <Button size="sm">Pequeño</Button>
                    <Button size="lg">Grande</Button>
                    <Button variant="secondary" shortcut="Ctrl K" icon="search">
                        Buscar
                    </Button>
                    <Button loading>Guardando</Button>
                    <Button disabled>Deshabilitado</Button>
                    <Button variant="secondary" disabledReason="Muestra de un motivo visible.">
                        Con motivo
                    </Button>
                </Row>
                <Row>
                    <IconButton label="Acercar" icon="zoomIn" shortcut="+" />
                    <IconButton label="Editar" icon="edit" tone="outline" />
                    <IconButton label="Ajustes" icon="settings" size="touch" />
                    <IconButton
                        label="Rotar"
                        icon="rotate"
                        tone="outline"
                        disabledReason="muestra"
                    />
                    <Kbd>Ctrl + Z</Kbd>
                    <Kbd>Supr</Kbd>
                </Row>
            </Block>

            <Block title="Campos y formularios">
                <div className={styles.grid}>
                    <Input label="Nombre del lote" hint="Como aparece en la escritura." />
                    <Input label="Retiro" unit="m" inputMode="decimal" defaultValue="3" />
                    <Input
                        label="Correo"
                        type="email"
                        defaultValue="ana@"
                        error="Escribe un correo válido."
                    />
                    <PasswordInput label="Contraseña" autoComplete="off" />
                    <Select label="Escala" defaultValue="100">
                        <option value="50">1:50</option>
                        <option value="100">1:100</option>
                    </Select>
                    <Textarea label="Descripción" rows={2} optional />
                </div>
                <Checkbox label="Casilla" description="Una línea de ayuda debajo." defaultChecked />
                <Checkbox
                    label="Casilla deshabilitada"
                    description="Dice por qué no se puede marcar."
                    disabled
                />
                <Range
                    label="Exposición"
                    value={exposure}
                    display={`${exposure.toLocaleString("es")} EV`}
                    min={0}
                    max={2}
                    step={0.1}
                    onChange={setExposure}
                />
                <Range
                    label="Nubes"
                    value={0}
                    display="0 %"
                    min={0}
                    max={100}
                    step={1}
                    onChange={() => undefined}
                    disabledReason="Muestra de un control deshabilitado con su motivo."
                />
            </Block>

            <Block title="Selección">
                <Tabs label="Pestañas de muestra" items={TABS} current={tab} onChange={setTab} />
                <Row>
                    <SegmentedControl
                        label="Vista"
                        options={[
                            { value: "grid", label: "Cuadrícula", icon: "grid" },
                            { value: "rows", label: "Lista", icon: "rows" },
                            { value: "timeline", label: "Cronograma", icon: "tasks" },
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
                        value={view === "timeline" ? "grid" : view}
                        onChange={setView}
                    />
                </Row>
                <Switch
                    label="Interruptor"
                    description="Se aplica al momento, sin botón de guardar."
                    checked={on}
                    onChange={(event) => setOn(event.target.checked)}
                />
                <MaterialPicker
                    label="Selector de materiales"
                    value={swatch}
                    onChange={setSwatch}
                    options={SWATCHES.map((item) => ({
                        id: item.id,
                        label: item.label,
                        detail: "detail" in item ? item.detail : undefined,
                        swatch: <span className={styles.tone} style={{ background: item.tone }} />,
                    }))}
                />
            </Block>

            <Block
                title="Menús"
                note="Clic derecho o Mayús+F10 sobre el elemento para el menú contextual."
            >
                <Row>
                    <Menu
                        label="Acciones de muestra"
                        items={[
                            {
                                label: "Abrir",
                                icon: "external",
                                onSelect: () => setPicked("Abrir"),
                            },
                            {
                                label: "Editar",
                                icon: "edit",
                                shortcut: "E",
                                onSelect: () => setPicked("Editar"),
                            },
                            {
                                label: "Duplicar",
                                icon: "copy",
                                disabled: true,
                                reason: "Motivo de muestra.",
                                onSelect: () => undefined,
                            },
                            {
                                label: "Eliminar",
                                icon: "trash",
                                danger: true,
                                separated: true,
                                onSelect: () => setPicked("Eliminar"),
                            },
                        ]}
                    />
                    <ContextMenu
                        label="Acciones del elemento de muestra"
                        items={[
                            { label: "Seleccionar", onSelect: () => setPicked("Seleccionar") },
                            {
                                label: "Ocultar",
                                icon: "eyeOff",
                                onSelect: () => setPicked("Ocultar"),
                            },
                        ]}
                    >
                        <button type="button" className={styles.target}>
                            Elemento con menú contextual
                        </button>
                    </ContextMenu>
                    <span role="status" className={styles.muted}>
                        Elegida: {picked}
                    </span>
                    <Tooltip text="Texto de ayuda" shortcut="F">
                        <Button variant="secondary">Con tooltip</Button>
                    </Tooltip>
                </Row>
            </Block>

            <Block title="Tarjetas, indicadores y propiedades">
                <div className={styles.grid}>
                    {/* The card's status mark is placed against the item that holds it in the lists. */}
                    <div className={styles.cardSlot}>
                        <ProjectCard project={SAMPLE_PROJECT} onOpen={() => undefined} />
                    </div>
                    <MetricCard
                        label="Indicador"
                        value="128"
                        unit="m²"
                        detail="Detalle de la cifra"
                        derived
                    />
                    <Card as="article">
                        <strong>Tarjeta</strong>
                        <p className={styles.muted}>Superficie sólida con borde fino.</p>
                    </Card>
                    <PropertyPanel title="Cuarto de muestra" kind="Cuarto">
                        <PropertySection title="Dimensiones">
                            <PropertyField
                                label="Ancho"
                                value={width}
                                unit="m"
                                min={0.5}
                                max={40}
                                onCommit={setWidth}
                            />
                            <PropertyRow label="Alto">2,80 m</PropertyRow>
                        </PropertySection>
                        <PropertySection title="Superficie" derived>
                            <PropertyRow label="Área">
                                {(width * 4).toLocaleString("es")} m²
                            </PropertyRow>
                        </PropertySection>
                    </PropertyPanel>
                </div>
                <Row>
                    <StatusBadge status="draft" />
                    <StatusBadge status="active" />
                    <StatusBadge status="archived" />
                    {TONES.map((tone) => (
                        <Tag key={tone} tone={tone} look="label">
                            {tone}
                        </Tag>
                    ))}
                </Row>
            </Block>

            <Block title="Diálogos, cajón y avisos">
                <Row>
                    <Button variant="secondary" onClick={() => setDialog(true)}>
                        Abrir diálogo
                    </Button>
                    <Button variant="secondary" onClick={() => setDrawer(true)}>
                        Abrir cajón
                    </Button>
                    <Button variant="danger" onClick={() => setConfirming(true)}>
                        Eliminar…
                    </Button>
                    <Button variant="tertiary" onClick={() => showToast("Aviso de muestra.")}>
                        Mostrar aviso
                    </Button>
                </Row>
                {dialog && (
                    <Dialog title="Diálogo" size="compact" onClose={() => setDialog(false)}>
                        <p>Se cierra con Escape o con el botón.</p>
                    </Dialog>
                )}
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
            </Block>

            <Block title="Progreso, carga y guardado">
                <ProgressBar label="Avance de muestra" value={0.62} showValue size="md" />
                <Row>
                    <Spinner size="sm" />
                    <Spinner label="Cargando la muestra…" />
                    <Spinner size="lg" />
                    {SAVE_STATES.map((state) => (
                        <span key={state} className={styles.row}>
                            <code>{state}</code>
                            <SaveIndicator state={state} />
                        </span>
                    ))}
                </Row>
                <div className={styles.grid}>
                    <Loader label="Cargando el modelo…" minHeight={160} />
                    <Skeleton shape="rows" count={3} height={160} />
                </div>
                <AsyncStatus
                    loading={false}
                    error="No se pudo conectar con el servidor."
                    isEmpty
                    emptyText=""
                    onRetry={() => undefined}
                />
            </Block>

            <Block title="Estados vacíos ilustrados">
                <div className={styles.grid}>
                    {ARTS.map((art) => (
                        <EmptyState
                            key={art}
                            art={art}
                            size="compact"
                            title={`Dibujo «${art}»`}
                            text="Qué falta y cómo empezar."
                            action={
                                art === "plan" ? (
                                    <Button variant="secondary">Crear el primero</Button>
                                ) : undefined
                            }
                        />
                    ))}
                </div>
            </Block>

            <Block
                title="Filtros y tabla"
                note="La tabla pasa a fichas cuando su panel se estrecha."
            >
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
                            cell: (row) =>
                                row.area === null
                                    ? "Sin registrar"
                                    : `${row.area.toLocaleString("es")} m²`,
                            sortValue: (row) => row.area,
                        },
                    ]}
                />
            </Block>

            <Block title="Controles de cámara">
                <div className={styles.scene}>
                    <CameraControls
                        view={cameraView}
                        onView={setCameraView}
                        projection={projection}
                        onProjection={setProjection}
                        onZoomIn={() => undefined}
                        onZoomOut={() => undefined}
                        onFrame={() => setCameraView(null)}
                        shortcuts={{ iso: "0", front: "1", side: "3", top: "7", frame: "F" }}
                    />
                </div>
                <CameraControls
                    tone="surface"
                    orientation="vertical"
                    view={cameraView}
                    onView={setCameraView}
                />
            </Block>

            <Block title="Movimiento" note="Las curvas y animaciones salen de styles/motion.css.">
                <MotionDemos />
            </Block>
        </div>
    );
}

/** Every shared component in both themes, and in compact density on demand. */
export function DesignSystemPage() {
    const [compact, setCompact] = useState(false);

    return (
        <div className={styles.page} data-density={compact ? "compact" : undefined}>
            <header className={styles.head}>
                <Logo size="sm" />
                <h1 className={styles.title}>Sistema de diseño</h1>
                <Switch
                    label="Densidad compacta"
                    checked={compact}
                    onChange={(event) => setCompact(event.target.checked)}
                />
            </header>
            {(["light", "dark"] as const).map((theme) => (
                <section
                    key={theme}
                    className={styles.theme}
                    data-theme={theme}
                    aria-label={theme === "light" ? "Tema claro" : "Tema oscuro"}
                >
                    <h2 className={styles.themeTitle}>
                        {theme === "light" ? "Tema claro" : "Tema oscuro"}
                    </h2>
                    <Showcase />
                </section>
            ))}
        </div>
    );
}
