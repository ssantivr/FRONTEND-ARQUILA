import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { conversationsApi } from "../services/api";
import { AssistantPanel } from "./AssistantPanel";

vi.mock("../services/api", () => ({
    conversationsApi: {
        status: vi.fn(),
        listByProject: vi.fn(),
        create: vi.fn(),
        get: vi.fn(),
        sendMessage: vi.fn(),
    },
}));

const api = vi.mocked(conversationsApi);
const NOW = "2026-10-05T10:00:00Z";

beforeEach(() => {
    vi.resetAllMocks();
    // jsdom has no layout, so it does not implement scrolling to the newest message.
    Element.prototype.scrollIntoView = vi.fn();
    api.status.mockResolvedValue({ provider: "rules", model: null });
    api.listByProject.mockResolvedValue([]);
    api.create.mockResolvedValue({ id: 5, project_id: 1, title: null, created_at: NOW });
    api.get.mockResolvedValue({
        id: 5,
        project_id: 1,
        title: null,
        created_at: NOW,
        messages: [],
    });
});

describe("AssistantPanel", () => {
    it("says who answers, so a rules answer is not taken for an AI one", async () => {
        render(<AssistantPanel projectId={1} />);

        expect(await screen.findByText("Reglas fijas, sin IA disponible")).toBeInTheDocument();
    });

    it("puts the questions about the open tab first and sends the one chosen to the API", async () => {
        api.sendMessage.mockResolvedValue([
            {
                id: 1,
                conversation_id: 5,
                role: "user",
                content: "¿Dónde podría reducir el costo?",
                source: null,
                created_at: NOW,
            },
            {
                id: 2,
                conversation_id: 5,
                role: "assistant",
                content: "El porcelanato es la partida más alta.",
                source: "rules",
                created_at: NOW,
            },
        ]);

        render(
            <AssistantPanel projectId={1} contextQuestions={["¿Dónde podría reducir el costo?"]} />,
        );

        const suggestions = screen.getByRole("group", { name: "Preguntas sugeridas" });

        expect(within(suggestions).getAllByRole("button")[0]).toHaveTextContent(
            "¿Dónde podría reducir el costo?",
        );

        await userEvent.click(
            within(suggestions).getByRole("button", { name: "¿Dónde podría reducir el costo?" }),
        );

        expect(api.create).toHaveBeenCalledWith(1);
        expect(api.sendMessage).toHaveBeenCalledWith(5, "¿Dónde podría reducir el costo?");
        expect(
            await screen.findByText("El porcelanato es la partida más alta."),
        ).toBeInTheDocument();
        expect(screen.getByText("Respuesta por reglas")).toBeInTheDocument();
    });

    it("offers a way to close it only when it is a drawer", async () => {
        const onClose = vi.fn();
        const { rerender } = render(<AssistantPanel projectId={1} />);

        expect(screen.queryByRole("button", { name: "Cerrar" })).not.toBeInTheDocument();

        rerender(<AssistantPanel projectId={1} onClose={onClose} />);
        await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));

        expect(onClose).toHaveBeenCalled();
    });
});
