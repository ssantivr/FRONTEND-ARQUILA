import { useEffect, useRef, useState, type FormEvent } from "react";

import { errorMessage, useAsync } from "../hooks/useAsync";
import { conversationsApi } from "../services/api";
import { useProjectState } from "../state/appState";
import type { AssistantStatus, ConversationMessage, StructureElement } from "../types/api";
import { formatNumber } from "../utils/format";
import { AsyncStatus } from "./AsyncStatus";
import { Panel } from "./Panel";

const MAX_MESSAGE_LENGTH = 4000;

const SUGGESTED_QUESTIONS = [
    "¿Qué debo considerar por la pendiente del terreno?",
    "¿Qué materiales pesan más en el costo?",
    "¿Qué datos le faltan a este proyecto?",
    "¿Qué me recomiendas revisar antes de construir?",
];

const SOURCE_STYLE: Record<AssistantStatus["provider"], string> = {
    claude: "ai",
    ollama: "ai",
    rules: "system",
};

const ELEMENT_NAMES: Record<StructureElement["kind"], string> = {
    room: "el cuarto",
    volume: "el volumen",
    column: "la columna",
    beam: "la viga",
    wall: "el muro",
};

export function elementQuestion(element: StructureElement): string {
    const size = [element.width_m, element.depth_m, element.height_m].map(formatNumber).join(" × ");

    return `¿Qué debo revisar en ${ELEMENT_NAMES[element.kind]} «${element.name}» (${size} m, ${element.plan_title})?`;
}

export function describeStatus(status: AssistantStatus): string {
    if (status.provider === "claude") {
        return `Claude (${status.model})`;
    }

    if (status.provider === "ollama") {
        return `Modelo local ${status.model} (Ollama)`;
    }

    return "Reglas fijas, sin IA disponible";
}

interface AssistantPanelProps {
    projectId: number;
}

export function AssistantPanel({ projectId }: AssistantPanelProps) {
    const conversations = useAsync(() => conversationsApi.listByProject(projectId), [projectId]);
    const status = useAsync(() => conversationsApi.status(), []);
    const [conversationId, setConversationId] = useState<number | null>(null);
    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const list = useRef<HTMLOListElement>(null);
    const didAutoOpen = useRef(false);
    const selection = useProjectState(projectId, (state) => state.selection);
    const questions =
        selection === null
            ? SUGGESTED_QUESTIONS
            : [elementQuestion(selection), ...SUGGESTED_QUESTIONS];

    const items = conversations.data ?? [];

    useEffect(() => {
        if (!didAutoOpen.current && items.length > 0) {
            didAutoOpen.current = true;
            setConversationId(items[items.length - 1].id);
        }
    }, [items]);

    useEffect(() => {
        if (conversationId === null) {
            setMessages([]);
            return;
        }

        let cancelled = false;

        conversationsApi
            .get(conversationId)
            .then((detail) => {
                if (!cancelled) {
                    setMessages(detail.messages);
                }
            })
            .catch((reason: unknown) => {
                if (!cancelled) {
                    setError(errorMessage(reason));
                }
            });

        return () => {
            cancelled = true;
        };
    }, [conversationId]);

    useEffect(() => {
        list.current?.lastElementChild?.scrollIntoView({ block: "nearest" });
    }, [messages, sending]);

    function handleSend(event: FormEvent) {
        event.preventDefault();
        ask(draft);
    }

    async function ask(question: string) {
        const content = question.trim();

        if (content === "" || sending) {
            return;
        }

        setSending(true);
        setError(null);

        try {
            let id = conversationId;

            if (id === null) {
                didAutoOpen.current = true;
                id = (await conversationsApi.create(projectId)).id;
                setConversationId(id);
            }

            const added = await conversationsApi.sendMessage(id, content);
            setMessages((current) => [
                ...current.filter((message) => !added.some((item) => item.id === message.id)),
                ...added,
            ]);
            setDraft("");
            conversations.reload();
        } catch (reason) {
            setError(errorMessage(reason));
        } finally {
            setSending(false);
        }
    }

    return (
        <Panel
            title="Asistente IA"
            actions={
                <div className="filters">
                    {items.length > 0 && (
                        <select
                            aria-label="Conversación"
                            value={conversationId ?? ""}
                            disabled={sending}
                            onChange={(event) =>
                                setConversationId(
                                    event.target.value === "" ? null : Number(event.target.value),
                                )
                            }
                        >
                            <option value="">Nueva conversación</option>
                            {items.map((conversation) => (
                                <option key={conversation.id} value={conversation.id}>
                                    {conversation.title ?? `Conversación ${conversation.id}`}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            }
        >
            <p className="message">
                Responde con los datos de este proyecto. Es una guía general: lo estructural y lo
                normativo debe confirmarlo un profesional. Si la IA no está disponible, contesta con
                reglas fijas sobre esos mismos datos y lo indica en la respuesta.
            </p>
            {status.data && (
                <p className="message assistant-status">
                    Ahora responde:{" "}
                    <span className={`badge badge-source-${SOURCE_STYLE[status.data.provider]}`}>
                        {describeStatus(status.data)}
                    </span>
                </p>
            )}
            <AsyncStatus
                loading={conversations.loading}
                error={conversations.error}
                onRetry={conversations.reload}
                isEmpty={false}
                emptyText=""
            />
            <ol className="chat" ref={list} aria-live="polite">
                {messages.map((message) => (
                    <li key={message.id} className={`chat-message chat-${message.role}`}>
                        <span className="chat-author">
                            {message.role === "user" ? "Tú" : "Asistente"}
                            {message.source === "rules" && (
                                <span className="badge badge-source-system">
                                    Respuesta por reglas
                                </span>
                            )}
                        </span>
                        <p>{message.content}</p>
                    </li>
                ))}
                {sending && (
                    <li className="chat-message chat-assistant">
                        <span className="chat-author">Asistente</span>
                        <p>Pensando…</p>
                    </li>
                )}
            </ol>
            {error && (
                <p className="message message-error" role="alert">
                    {error}
                </p>
            )}
            <div className="suggestions" role="group" aria-label="Preguntas sugeridas">
                {questions.map((question) => (
                    <button
                        key={question}
                        type="button"
                        className="button-secondary suggestion"
                        disabled={sending}
                        onClick={() => ask(question)}
                    >
                        {question}
                    </button>
                ))}
            </div>
            <form className="form-row" onSubmit={handleSend}>
                <label className="field-wide">
                    Pregunta
                    <textarea
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        maxLength={MAX_MESSAGE_LENGTH}
                        rows={2}
                        placeholder="¿Qué debería considerar para la cimentación?"
                        disabled={sending}
                        required
                    />
                </label>
                <button type="submit" disabled={sending || draft.trim() === ""}>
                    Enviar
                </button>
            </form>
        </Panel>
    );
}
