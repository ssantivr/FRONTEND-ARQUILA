import * as RadixDialog from "@radix-ui/react-dialog";
import { useEffect, useId, useState } from "react";

import { useAnimatedClose } from "../hooks/useAnimatedClose";
import { useProjectSearch } from "../hooks/useProjectSearch";
import { Icon, type IconName } from "./Icon";
import styles from "./CommandPalette.module.css";

export interface Command {
    id: string;
    /** Heading the command is listed under, such as «Ir a» or «Acciones». */
    group: string;
    label: string;
    icon: IconName;
    /** Shown at the right of the row: the key that does the same, when there is one. */
    hint?: string;
    run: () => void;
}

interface CommandPaletteProps {
    commands: Command[];
    onOpenProject: (projectId: number) => void;
    onClose: () => void;
}

/** Lower case and without accents, so «analisis» finds «Análisis». */
function plain(text: string): string {
    return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * The command palette (Ctrl/Cmd+K): one field to jump to a screen, to a tab of the open project
 * or to a project by name, and to run an action, without leaving the keyboard.
 */
export function CommandPalette({ commands, onOpenProject, onClose }: CommandPaletteProps) {
    const closing = useAnimatedClose<HTMLDivElement>(onClose);
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);
    const listId = useId();
    const search = useProjectSearch(query);
    const wanted = plain(query.trim());
    const matching = commands.filter((command) => plain(command.label).includes(wanted));
    const found: Command[] =
        search.state === "ready"
            ? search.projects.map((project) => ({
                  id: `project-${project.id}`,
                  group: "Proyectos",
                  label: project.name,
                  icon: "projects",
                  hint: project.location ?? undefined,
                  run: () => onOpenProject(project.id),
              }))
            : [];
    const options = [...matching, ...found];
    const groups = [...new Set(options.map((option) => option.group))];
    const current = Math.min(active, Math.max(options.length - 1, 0));
    const activeId = options.length === 0 ? undefined : `${listId}-${options[current].id}`;

    // The list scrolls: the option the arrows land on is brought into view.
    useEffect(() => {
        if (activeId !== undefined) {
            document.getElementById(activeId)?.scrollIntoView?.({ block: "nearest" });
        }
    }, [activeId]);

    function run(command: Command) {
        onClose();
        command.run();
    }

    return (
        <RadixDialog.Root
            open={closing.open}
            onOpenChange={(open) => {
                if (!open) {
                    closing.requestClose();
                }
            }}
        >
            <RadixDialog.Portal container={document.fullscreenElement as HTMLElement | null}>
                <RadixDialog.Overlay className={styles.overlay} />
                <RadixDialog.Content
                    ref={closing.ref}
                    onAnimationEnd={closing.onAnimationEnd}
                    className={styles.palette}
                    aria-describedby={undefined}
                >
                    <RadixDialog.Title className={styles.title}>
                        Paleta de comandos
                    </RadixDialog.Title>
                    <div className={styles.field}>
                        <Icon name="search" />
                        <input
                            type="text"
                            role="combobox"
                            aria-label="Buscar una pantalla, un proyecto o una acción"
                            aria-expanded={options.length > 0}
                            aria-controls={listId}
                            aria-activedescendant={activeId}
                            aria-autocomplete="list"
                            placeholder="Escribe una pantalla, un proyecto o una acción"
                            autoComplete="off"
                            spellCheck={false}
                            value={query}
                            onChange={(event) => {
                                setQuery(event.target.value);
                                setActive(0);
                            }}
                            onKeyDown={(event) => {
                                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                                    event.preventDefault();

                                    if (options.length > 0) {
                                        const step = event.key === "ArrowDown" ? 1 : -1;

                                        setActive(
                                            (current + step + options.length) % options.length,
                                        );
                                    }
                                } else if (event.key === "Enter" && options.length > 0) {
                                    event.preventDefault();
                                    run(options[current]);
                                }
                            }}
                        />
                        <kbd className={styles.key}>Esc</kbd>
                    </div>
                    <div id={listId} className={styles.list} role="listbox" aria-label="Resultados">
                        {groups.map((group) => (
                            <div key={group} role="group" aria-label={group}>
                                <p className={styles.group} aria-hidden="true">
                                    {group}
                                </p>
                                {options
                                    .filter((option) => option.group === group)
                                    .map((option) => (
                                        <div
                                            key={option.id}
                                            id={`${listId}-${option.id}`}
                                            role="option"
                                            aria-selected={option === options[current]}
                                            className={styles.option}
                                            onPointerMove={() => setActive(options.indexOf(option))}
                                            onClick={() => run(option)}
                                        >
                                            <Icon name={option.icon} />
                                            <span className={styles.label}>{option.label}</span>
                                            {option.hint !== undefined && (
                                                <span className={styles.hint}>{option.hint}</span>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        ))}
                    </div>
                    {search.state === "loading" && (
                        <p className={styles.note}>Buscando proyectos…</p>
                    )}
                    {search.state === "error" && (
                        <p className={`${styles.note} message-error`} role="alert">
                            No se pudieron buscar los proyectos: {search.message}
                        </p>
                    )}
                    {options.length === 0 &&
                        search.state !== "loading" &&
                        search.state !== "error" && (
                            <p className={styles.note} role="status">
                                Nada coincide con «{query.trim()}». Prueba con el nombre de una
                                pantalla o de un proyecto.
                            </p>
                        )}
                    <p className={styles.foot} aria-hidden="true">
                        <span>
                            <kbd className={styles.key}>↑</kbd>
                            <kbd className={styles.key}>↓</kbd> para moverte
                        </span>
                        <span>
                            <kbd className={styles.key}>Enter</kbd> para abrir
                        </span>
                    </p>
                </RadixDialog.Content>
            </RadixDialog.Portal>
        </RadixDialog.Root>
    );
}
