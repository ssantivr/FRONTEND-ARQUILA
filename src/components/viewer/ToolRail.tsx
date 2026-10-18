import { Icon, type IconName } from "../Icon";
import { Tooltip } from "../ui/Tooltip";
import styles from "./ToolRail.module.css";

export interface RailTool {
    id: string;
    label: string;
    icon: IconName;
    /** Key that does the same; shown in the tooltip and announced with `aria-keyshortcuts`. */
    shortcut?: string;
    /** Set for tools that stay on, such as the cut or the isolated room. */
    pressed?: boolean;
    /** Why the tool cannot be used now. It stays focusable, so the reason can be read. */
    unavailable?: string;
    onUse: () => void;
}

interface ToolRailProps {
    tools: RailTool[];
    /** Told why a tool that does not apply was pressed, so the screen can say it out loud. */
    onUnavailable: (reason: string) => void;
}

/**
 * The fixed vertical bar at the left of the scene. A tool that does not apply to what is selected
 * is not hidden: it stays in its place, dimmed, and its tooltip says what to do to use it.
 */
export function ToolRail({ tools, onUnavailable }: ToolRailProps) {
    return (
        <div
            className={`hud hud-rail ${styles.rail}`}
            role="toolbar"
            aria-orientation="vertical"
            aria-label="Herramientas de selección"
        >
            {tools.map((tool) => (
                <Tooltip
                    key={tool.id}
                    side="right"
                    text={tool.unavailable ?? tool.label}
                    shortcut={tool.unavailable === undefined ? tool.shortcut : undefined}
                    describes={tool.unavailable !== undefined}
                >
                    <button
                        type="button"
                        className={styles.tool}
                        aria-label={tool.label}
                        aria-pressed={tool.pressed}
                        aria-disabled={tool.unavailable !== undefined || undefined}
                        aria-keyshortcuts={tool.shortcut}
                        onClick={() => {
                            if (tool.unavailable === undefined) {
                                tool.onUse();
                            } else {
                                onUnavailable(tool.unavailable);
                            }
                        }}
                    >
                        <Icon name={tool.icon} />
                    </button>
                </Tooltip>
            ))}
        </div>
    );
}
