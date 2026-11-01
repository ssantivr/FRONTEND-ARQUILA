import type { Project } from "../types/api";
import { Select } from "./ui/Input";

interface ProjectPickerProps {
    projects: Project[];
    value: number | null;
    onChange: (projectId: number) => void;
}

export function ProjectPicker({ projects, value, onChange }: ProjectPickerProps) {
    return (
        <Select
            label="Proyecto"
            fieldClassName="project-picker"
            value={value ?? ""}
            onChange={(event) => onChange(Number(event.target.value))}
        >
            {projects.map((project) => (
                <option key={project.id} value={project.id}>
                    {project.name}
                </option>
            ))}
        </Select>
    );
}
