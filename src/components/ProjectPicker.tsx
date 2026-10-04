import type { Project } from "../types/api";

interface ProjectPickerProps {
    projects: Project[];
    value: number | null;
    onChange: (projectId: number) => void;
}

export function ProjectPicker({ projects, value, onChange }: ProjectPickerProps) {
    return (
        <label className="project-picker">
            Proyecto
            <select
                value={value ?? ""}
                onChange={(event) => onChange(Number(event.target.value))}
            >
                {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                        {project.name}
                    </option>
                ))}
            </select>
        </label>
    );
}
