import { elementKey, isSpace } from "../../three/BuildingSceneManager";
import type { StructureElement } from "../../types/api";
import { Icon } from "../Icon";
import { itemLabel } from "./labels";

interface Level {
    planId: number;
    title: string;
    base: number;
    elements: StructureElement[];
}

const TREE_GROUPS: { label: string; spaces: boolean }[] = [
    { label: "Espacios", spaces: true },
    { label: "Estructura", spaces: false },
];

function groupByLevel(elements: StructureElement[]): Level[] {
    const levels = new Map<number, Level>();

    for (const element of elements) {
        const level = levels.get(element.plan_id);

        if (level === undefined) {
            levels.set(element.plan_id, {
                planId: element.plan_id,
                title: element.plan_title,
                base: element.base_m,
                elements: [element],
            });
        } else {
            level.base = Math.min(level.base, element.base_m);
            level.elements.push(element);
        }
    }

    return [...levels.values()].sort((a, b) => a.base - b.base);
}

interface ObjectTreeProps {
    /** Every element of the model, and the ones left by the search. */
    elements: StructureElement[];
    visibleElements: StructureElement[];
    query: string;
    onQuery: (query: string) => void;
    selectedKey: string | null;
    onSelect: (key: string | null) => void;
    hiddenKeys: ReadonlySet<string>;
    onToggleHidden: (key: string) => void;
    roofHiddenWithRooms: boolean;
}

/** The objects of the model by level: each one can be selected, and hidden with its eye. */
export function ObjectTree({
    elements,
    visibleElements,
    query,
    onQuery,
    selectedKey,
    onSelect,
    hiddenKeys,
    onToggleHidden,
    roofHiddenWithRooms,
}: ObjectTreeProps) {
    return (
        <aside className="hud hud-levels" aria-label="Objetos del modelo">
            <details open>
                <summary>Objetos · {elements.length}</summary>
                {elements.length === 0 ? (
                    <p>Agrega cuartos a un plano, o ponle un nivel numérico, para verlo aquí.</p>
                ) : (
                    <input
                        type="search"
                        className="hud-search"
                        placeholder="Buscar objeto"
                        aria-label="Buscar objeto por nombre"
                        value={query}
                        onChange={(event) => onQuery(event.target.value)}
                    />
                )}
                {groupByLevel(visibleElements).map((level) => (
                    <details key={level.planId} className="hud-tree" open>
                        <summary>
                            {level.title}
                            <span className="hud-count">{level.elements.length}</span>
                        </summary>
                        {TREE_GROUPS.map((group) => {
                            const members = level.elements.filter(
                                (element) => isSpace(element) === group.spaces,
                            );

                            if (members.length === 0) {
                                return null;
                            }

                            return (
                                <section key={group.label}>
                                    <h4>{group.label}</h4>
                                    {members.map((element) => {
                                        const key = elementKey(element);
                                        const hidden = hiddenKeys.has(key);

                                        return (
                                            <div key={key} className="hud-tree-row">
                                                <button
                                                    type="button"
                                                    className="hud-item"
                                                    aria-pressed={key === selectedKey}
                                                    onClick={() =>
                                                        onSelect(key === selectedKey ? null : key)
                                                    }
                                                >
                                                    {itemLabel(element)}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="hud-item hud-eye"
                                                    aria-pressed={hidden}
                                                    aria-label={`${hidden ? "Mostrar" : "Ocultar"} ${itemLabel(element)}`}
                                                    title={
                                                        hidden
                                                            ? "Mostrar en el modelo"
                                                            : "Ocultar del modelo"
                                                    }
                                                    onClick={() => onToggleHidden(key)}
                                                >
                                                    <Icon name={hidden ? "eyeOff" : "eye"} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </section>
                            );
                        })}
                    </details>
                ))}
                {roofHiddenWithRooms && (
                    <p className="hud-note" role="status">
                        El techo se oculta mientras haya un cuarto oculto en la última planta,
                        porque se apoya en ellos.
                    </p>
                )}
                {elements.length > 0 && visibleElements.length === 0 && (
                    <p>Ningún objeto coincide con la búsqueda.</p>
                )}
            </details>
        </aside>
    );
}
