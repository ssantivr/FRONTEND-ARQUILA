import { useEffect, useRef, useState } from "react";

import { errorMessage } from "../hooks/useAsync";
import { structureApi } from "../services/api";
import type { Project, Structure } from "../types/api";
import { formatDateTime } from "../utils/format";
import { StatusBadge } from "./Badge";

interface ProjectCardProps {
    project: Project;
    onOpen: (projectId: number) => void;
}

type PreviewState =
    | { status: "idle" | "loading" }
    | { status: "ready"; structure: Structure }
    | { status: "error"; message: string };

export function ProjectCard({ project, onOpen }: ProjectCardProps) {
    return (
        <button type="button" className="card project-card" onClick={() => onOpen(project.id)}>
            <ProjectThumbnail project={project} />
            <span className="project-card-content">
                <span className="project-card-topline">
                    <StatusBadge status={project.status} />
                    <span className="project-card-date">{formatDateTime(project.updated_at)}</span>
                </span>
                <span className="card-title">{project.name}</span>
                <span className="card-subtitle">{project.location ?? "Ubicación por definir"}</span>
                <span className="project-card-progress">
                    <span />
                </span>
            </span>
        </button>
    );
}

function ProjectThumbnail({ project }: { project: Project }) {
    const node = useRef<HTMLSpanElement>(null);
    const [visible, setVisible] = useState(false);
    const [preview, setPreview] = useState<PreviewState>({ status: "idle" });

    useEffect(() => {
        const element = node.current;

        if (!element) {
            return;
        }

        if (!("IntersectionObserver" in window)) {
            setVisible(true);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: "100px" },
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!visible) {
            return;
        }

        let current = true;
        setPreview({ status: "loading" });

        structureApi
            .get(project.id)
            .then((structure) => {
                if (current) {
                    setPreview({ status: "ready", structure });
                }
            })
            .catch((reason: unknown) => {
                if (current) {
                    setPreview({ status: "error", message: errorMessage(reason) });
                }
            });

        return () => {
            current = false;
        };
    }, [project.id, visible]);

    const structure = preview.status === "ready" ? preview.structure : null;
    const groundLevel =
        structure?.rooms.find((room) =>
            /planta baja|primer piso|nivel 1|ground|piso 1/i.test(
                `${room.plan_title} ${room.level ?? ""}`,
            ),
        ) ?? structure?.rooms[0];
    const rooms = groundLevel
        ? (structure?.rooms.filter((room) => room.plan_id === groundLevel.plan_id) ?? [])
        : [];
    const terrains = structure?.terrains ?? [];
    const components = structure?.components ?? [];
    const points = [
        ...terrains.flatMap((terrain) => terrain.outline),
        ...rooms.flatMap((room) => [
            { x_m: room.x_m, y_m: room.y_m },
            { x_m: room.x_m + room.width_m, y_m: room.y_m + room.depth_m },
        ]),
    ];
    const minX = Math.min(0, ...points.map((point) => point.x_m));
    const minY = Math.min(0, ...points.map((point) => point.y_m));
    const maxX = Math.max(1, ...points.map((point) => point.x_m));
    const maxY = Math.max(1, ...points.map((point) => point.y_m));
    const rangeX = Math.max(maxX - minX, 1);
    const rangeY = Math.max(maxY - minY, 1);
    const scale = Math.min(128 / rangeX, 64 / rangeY);
    const width = rangeX * scale;
    const height = rangeY * scale;
    const left = (160 - width) / 2;
    const top = (96 - height) / 2;
    const hasGeometry = terrains.length > 0 || rooms.length > 0;
    const progress =
        structure === null
            ? 0
            : Math.round(
                  ([terrains.length > 0, rooms.length > 0, components.length > 0].filter(Boolean)
                      .length /
                      3) *
                      100,
              );
    const previewLabel =
        preview.status === "error"
            ? `Vista previa no disponible: ${preview.message}`
            : hasGeometry
              ? `Vista previa del terreno y distribución de ${project.name}`
              : `Sin geometría registrada para ${project.name}`;

    return (
        <span className="project-preview-wrap">
            <span className="project-thumbnail" ref={node}>
                <svg viewBox="0 0 160 96" role="img" aria-label={previewLabel}>
                    <defs>
                        <pattern
                            id={`project-grid-${project.id}`}
                            width="8"
                            height="8"
                            patternUnits="userSpaceOnUse"
                        >
                            <path d="M8 0H0V8" className="project-thumbnail-grid" />
                        </pattern>
                    </defs>
                    <rect width="160" height="96" className="project-thumbnail-paper" />
                    <rect width="160" height="96" fill={`url(#project-grid-${project.id})`} />
                    {terrains.map((terrain) => {
                        const polygon = terrain.outline
                            .map((point) => {
                                const x = left + (point.x_m - minX) * scale;
                                const y = top + height - (point.y_m - minY) * scale;
                                return `${x},${y}`;
                            })
                            .join(" ");

                        return (
                            <polygon
                                key={terrain.id}
                                points={polygon}
                                className="project-thumbnail-terrain"
                            />
                        );
                    })}
                    {rooms.map((room) => {
                        const roomWidth = room.width_m * scale;
                        const roomHeight = room.depth_m * scale;
                        const x = left + (room.x_m - minX) * scale;
                        const y = top + height - (room.y_m - minY + room.depth_m) * scale;

                        return (
                            <rect
                                key={`${room.plan_id}-${room.id}`}
                                x={x}
                                y={y}
                                width={roomWidth}
                                height={roomHeight}
                                rx="1.5"
                                className="project-thumbnail-room"
                            />
                        );
                    })}
                    {!hasGeometry && (
                        <g className="project-thumbnail-empty">
                            <path d="m49 64 29-17 33 12-29 17zM78 47v18m33-6v15M49 64v14l33 12 29-14" />
                            <circle cx="127" cy="27" r="2" />
                        </g>
                    )}
                    <text x="8" y="12" className="project-thumbnail-label">
                        {preview.status === "loading" || preview.status === "idle"
                            ? "CARGANDO PLANO"
                            : hasGeometry
                              ? "IMPLANTACIÓN / PLANTA"
                              : "SIN GEOMETRÍA"}
                    </text>
                </svg>
            </span>
            {preview.status === "ready" && (
                <span
                    className="project-card-progress"
                    aria-label={`Preparación del modelo: ${progress}%`}
                >
                    <span className="project-card-progress-track">
                        <span style={{ width: `${progress}%` }} />
                    </span>
                    <span className="project-card-progress-label">Modelo {progress}%</span>
                </span>
            )}
        </span>
    );
}
