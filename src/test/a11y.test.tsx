import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";

import { CommandPalette } from "../components/CommandPalette";
import CostChart from "../components/CostChart";
import { FormActions } from "../components/RowActions";
import { Toasts } from "../components/Toasts";
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
import { showToast } from "../state/toasts";

vi.mock("../services/api", () => ({
    projectsApi: { list: vi.fn().mockResolvedValue([]) },
}));

/** Runs axe-core on what was rendered and gives back its violations, by rule. */
async function violations(container: Element): Promise<string[]> {
    const results = await axe(container, {
        // jsdom has no layout or colours: contrast is checked by `npm run contraste` on the
        // tokens and by `npm run accesibilidad` in a real browser.
        rules: { "color-contrast": { enabled: false } },
    });

    return results.violations.map((violation) => `${violation.id}: ${violation.help}`);
}

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
                    saving="saved"
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
