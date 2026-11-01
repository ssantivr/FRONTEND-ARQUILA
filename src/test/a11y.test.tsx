import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CommandPalette } from "../components/CommandPalette";
import CostChart from "../components/CostChart";
import { FormActions } from "../components/RowActions";
import { Sidebar } from "../components/Sidebar";
import { Toasts } from "../components/Toasts";
import { TopBar } from "../components/TopBar";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Dialog } from "../components/ui/Dialog";
import { EmptyState } from "../components/ui/EmptyState";
import { Input, Select } from "../components/ui/Input";
import { LiveForm } from "../components/ui/LiveForm";
import { MetricCard } from "../components/ui/MetricCard";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Skeleton } from "../components/ui/Skeleton";
import { Tooltip } from "../components/ui/Tooltip";
import { ShortcutsDialog } from "../components/viewer/ShortcutsDialog";
import { StatusBar } from "../components/viewer/StatusBar";
import { ToolRail } from "../components/viewer/ToolRail";
import { ViewerProblem } from "../components/viewer/ViewerBoundary";
import { HomePage } from "../pages/HomePage";
import { TasksPage } from "../pages/TasksPage";
import { setThemePreference } from "../state/theme";
import { showToast } from "../state/toasts";

vi.mock("../services/api", () => {
    const project = {
        id: 1,
        owner_id: 1,
        name: "Casa Andina",
        description: null,
        location: "Quito",
        status: "active",
        created_at: "2026-10-01T12:00:00Z",
        updated_at: "2026-10-02T12:00:00Z",
        progress: 40,
    };
    const log = {
        id: 1,
        project_id: 1,
        room_id: null,
        spatial_element_id: null,
        created_by: 1,
        layer: "finishes",
        title: "Pintar la fachada",
        description: null,
        status: "planned",
        planned_start: null,
        planned_end: "2026-11-02",
        completed_at: null,
        estimated_cost: null,
        created_at: "2026-10-01T12:00:00Z",
        updated_at: "2026-10-02T12:00:00Z",
    };

    return {
        projectsApi: { list: vi.fn().mockResolvedValue([project]) },
        notificationsApi: { list: vi.fn().mockResolvedValue([]) },
        summaryApi: {
            get: vi.fn().mockResolvedValue({
                projects: 1,
                draft_projects: 0,
                active_projects: 1,
                archived_projects: 0,
                terrains: 0,
                total_area_m2: 0,
                materials_total_cost: 0,
            }),
        },
        activityApi: {
            listByProject: vi.fn().mockResolvedValue({
                items: [
                    {
                        id: 1,
                        project_id: 1,
                        user_id: 1,
                        action: "created",
                        entity_type: "terrain",
                        entity_id: 1,
                        detail: { label: "Lote 14" },
                        created_at: "2026-10-02T12:00:00Z",
                    },
                ],
                total: 1,
                page: 1,
                page_size: 5,
            }),
        },
        loadAcrossProjects: vi.fn().mockResolvedValue({ projects: [project], items: [log] }),
        loadProjectTasks: vi.fn(),
        walkthroughApi: {},
    };
});

/** Runs axe-core on what was rendered and gives back its violations, by rule. */
async function violations(container: Element): Promise<string[]> {
    const results = await axe(container, {
        // jsdom has no layout or colours: contrast is checked by `npm run contraste` on the
        // tokens and by `npm run accesibilidad` in a real browser.
        rules: { "color-contrast": { enabled: false } },
    });

    return results.violations.map((violation) => `${violation.id}: ${violation.help}`);
}

describe("accessibility of the main screens (axe-core)", () => {
    afterEach(() => setThemePreference("auto"));

    it.each(["light", "dark"] as const)("Home has nothing wrong in the %s theme", async (theme) => {
        setThemePreference(theme);

        const { container } = render(
            <main>
                <HomePage
                    user={{
                        id: 1,
                        name: "Ana",
                        email: "ana@example.com",
                        created_at: "2026-10-01T12:00:00Z",
                    }}
                    onOpenProject={() => undefined}
                    onNavigate={() => undefined}
                />
            </main>,
        );

        await screen.findByText("Pintar la fachada");
        await screen.findByText(/Lote 14/);

        expect(await violations(container)).toEqual([]);
    });

    it.each(["light", "dark"] as const)(
        "a list screen has nothing wrong in the %s theme",
        async (theme) => {
            setThemePreference(theme);

            const { container } = render(
                <main>
                    <TasksPage onOpenProject={() => undefined} />
                </main>,
            );

            await screen.findByText("Pintar la fachada");

            expect(container.querySelectorAll("h1")).toHaveLength(1);
            expect(await violations(container)).toEqual([]);
        },
    );
});

describe("accessibility of the shell (axe-core)", () => {
    afterEach(() => setThemePreference("auto"));

    it.each(["light", "dark"] as const)("finds nothing wrong in the %s theme", async (theme) => {
        setThemePreference(theme);

        const { container } = render(
            <div>
                <a className="skip-link" href="#content">
                    Saltar al contenido
                </a>
                <Sidebar
                    current="terrains"
                    onNavigate={() => undefined}
                    onToggle={() => undefined}
                    onLogout={() => undefined}
                    user={{ name: "Ana", email: "ana@example.com" }}
                />
                <div>
                    <TopBar
                        crumbs={[{ label: "Inicio", href: "/" }, { label: "Terrenos" }]}
                        user={{ name: "Ana", email: "ana@example.com" }}
                        onOpenProject={() => undefined}
                        onOpenCommands={() => undefined}
                        onOpenSettings={() => undefined}
                        onLogout={() => undefined}
                        onSlot={() => undefined}
                        onCrumbsSlot={() => undefined}
                        onOpenMenu={() => undefined}
                    />
                    <main id="content" tabIndex={-1}>
                        <h1>Terrenos</h1>
                    </main>
                </div>
            </div>,
        );

        expect(await violations(container)).toEqual([]);
    });
});

describe("accessibility of the shared components (axe-core)", () => {
    it("finds nothing wrong in the pieces of ui/", async () => {
        const { container } = render(
            <main>
                <h1>Componentes</h1>
                <Breadcrumbs
                    items={[
                        { label: "Proyectos", href: "/proyectos" },
                        { label: "Casa Mirador", href: "/proyectos/1/terreno" },
                        { label: "Modelo 3D" },
                    ]}
                />
                <Card as="article" aria-label="Lote Mirador">
                    <p>552 m²</p>
                </Card>
                <MetricCard label="COS" value="0,18" detail="Cumple · máx. 0,6" />
                <ProgressBar label="Avance de la obra" value={0.4} />
                <Skeleton shape="rows" count={2} />
                <EmptyState
                    title="Sin planos todavía"
                    text="Este proyecto no tiene planos."
                    action={<Button variant="secondary">Agregar el primer plano</Button>}
                />
                <Tooltip text="Enfocar lo seleccionado" shortcut="F">
                    <Button aria-label="Enfocar">F</Button>
                </Tooltip>
                <Input label="Nombre del lote" hint="Como aparece en la escritura." />
                <Input label="Retiro" error="El valor más bajo que se admite es 0." />
                <Select label="Escala">
                    <option>1:100</option>
                </Select>
            </main>,
        );

        expect(await violations(container)).toEqual([]);
    });

    it("finds nothing wrong in a form with its saving button and a field in error", async () => {
        const { container } = render(
            <main>
                <LiveForm aria-label="Agregar terreno" onSubmit={(event) => event.preventDefault()}>
                    <label>
                        Nombre
                        <input required />
                    </label>
                    <FormActions editing addLabel="Agregar terreno" onCancel={() => undefined} />
                </LiveForm>
            </main>,
        );

        container.querySelector("form")?.requestSubmit();

        expect(container.querySelector("[aria-invalid]")).not.toBeNull();
        expect(await violations(container)).toEqual([]);
    });

    it("finds nothing wrong in the tools and the status of the 3D viewer", async () => {
        const { container } = render(
            <main>
                <ToolRail
                    onUnavailable={() => undefined}
                    tools={[
                        {
                            id: "focus",
                            label: "Enfocar",
                            icon: "focus",
                            shortcut: "F",
                            onUse: () => undefined,
                        },
                        {
                            id: "isolate",
                            label: "Aislar cuarto",
                            icon: "isolate",
                            shortcut: "I",
                            unavailable: "Selecciona un cuarto para aislarlo",
                            onUse: () => undefined,
                        },
                        {
                            id: "cut",
                            label: "Corte",
                            icon: "cut",
                            pressed: true,
                            onUse: () => undefined,
                        },
                    ]}
                />
                <StatusBar
                    selection="Sala"
                    camera="Isométrica"
                    projection="perspective"
                    zoom={100}
                    tip="I aísla el cuarto · F lo enfoca"
                />
                <ViewerProblem
                    title="El modelo 3D se detuvo"
                    text="Tus datos están a salvo."
                    onRetry={() => undefined}
                />
            </main>,
        );

        expect(await violations(container)).toEqual([]);
    });

    it("finds nothing wrong in the cost chart and its table", async () => {
        const { container } = render(
            <main>
                <CostChart
                    label="Costo por categoría del proyecto"
                    items={[
                        { category: "Estructura", amount: 7370, share: 33 },
                        { category: "Acabados", amount: 4158, share: 19 },
                    ]}
                />
            </main>,
        );

        expect(await violations(container)).toEqual([]);
    });

    it("finds nothing wrong in the windows: a dialog, the shortcuts and the command palette", async () => {
        const first = render(
            <Dialog title="Vista previa" onClose={() => undefined}>
                <p>Contenido</p>
            </Dialog>,
        );

        expect(await violations(first.baseElement)).toEqual([]);
        first.unmount();

        const second = render(<ShortcutsDialog onClose={() => undefined} />);

        expect(await violations(second.baseElement)).toEqual([]);
        second.unmount();

        const third = render(
            <CommandPalette
                onOpenProject={() => undefined}
                onClose={() => undefined}
                commands={[
                    {
                        id: "a",
                        group: "Ir a",
                        label: "Terrenos",
                        icon: "terrains",
                        run: () => undefined,
                    },
                    {
                        id: "b",
                        group: "Acciones",
                        label: "Cerrar sesión",
                        icon: "logout",
                        run: () => undefined,
                    },
                ]}
            />,
        );

        expect(await violations(third.baseElement)).toEqual([]);
    });

    it("finds nothing wrong in a toast", async () => {
        const { container } = render(
            <main>
                <Toasts />
            </main>,
        );

        showToast("Proyecto creado.");

        expect(await violations(container)).toEqual([]);
    });
});
