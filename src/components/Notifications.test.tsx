import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { notificationsApi } from "../services/api";
import { ApiError } from "../services/http";
import type { Notification } from "../types/api";
import { Notifications } from "./Notifications";

vi.mock("../services/api", () => ({
    notificationsApi: { list: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn() },
}));

const list = vi.mocked(notificationsApi.list);
const markRead = vi.mocked(notificationsApi.markRead);
const markAllRead = vi.mocked(notificationsApi.markAllRead);

function notification(overrides: Partial<Notification> = {}): Notification {
    return {
        id: 1,
        title: "Contraseña cambiada",
        body: "Tu contraseña se cambió desde un enlace de recuperación.",
        read_at: null,
        created_at: "2026-10-20T12:00:00Z",
        ...overrides,
    };
}

beforeEach(() => {
    list.mockReset();
    markRead.mockReset();
    markAllRead.mockReset();
});

describe("Notifications", () => {
    it("counts the unread ones from the API on the bell", async () => {
        list.mockResolvedValue([
            notification(),
            notification({ id: 2, title: "Otra", read_at: "2026-10-20T13:00:00Z" }),
        ]);
        render(<Notifications />);

        expect(
            await screen.findByRole("button", { name: "Notificaciones: 1 sin leer" }),
        ).toBeInTheDocument();
    });

    it("lists them and marks one read when it is opened", async () => {
        const unread = notification();

        list.mockResolvedValue([unread]);
        markRead.mockResolvedValue({ ...unread, read_at: "2026-10-21T08:00:00Z" });
        render(<Notifications />);

        await userEvent.click(await screen.findByRole("button", { name: /1 sin leer/ }));

        const panel = screen.getByRole("region", { name: "Notificaciones" });
        const item = await within(panel).findByRole("button", { name: /Contraseña cambiada/ });

        expect(item).toHaveTextContent("Sin leer");
        await userEvent.click(item);

        expect(markRead).toHaveBeenCalledWith(1);
        expect(await screen.findByRole("button", { name: "Notificaciones" })).toBeInTheDocument();
        expect(item).not.toHaveTextContent("Sin leer");
    });

    it("marks all of them read at once", async () => {
        // Asked for when the bell appears and again when it is opened; then after marking.
        list.mockResolvedValueOnce([notification(), notification({ id: 2 })]);
        list.mockResolvedValueOnce([notification(), notification({ id: 2 })]);
        list.mockResolvedValue([notification({ read_at: "2026-10-21T08:00:00Z" })]);
        markAllRead.mockResolvedValue({ updated: 2 });
        render(<Notifications />);

        await userEvent.click(await screen.findByRole("button", { name: /2 sin leer/ }));
        await userEvent.click(
            await screen.findByRole("button", { name: "Marcar todas como leídas" }),
        );

        expect(markAllRead).toHaveBeenCalledTimes(1);
        expect(
            await screen.findByRole("button", { name: "Notificaciones", expanded: true }),
        ).toBeInTheDocument();
    });

    it("says an API without the route sends no notifications, instead of an error", async () => {
        list.mockRejectedValue(new ApiError(404, "Not Found"));
        render(<Notifications />);

        await userEvent.click(screen.getByRole("button", { name: "Notificaciones" }));

        expect(
            await within(screen.getByRole("region", { name: "Notificaciones" })).findByText(
                /todavía no envía avisos/,
            ),
        ).toBeInTheDocument();
        expect(screen.queryByRole("alert")).toBeNull();
    });

    it("shows a failure with a way to try again", async () => {
        list.mockRejectedValue(new ApiError(500, "Internal Server Error"));
        render(<Notifications />);

        await userEvent.click(screen.getByRole("button", { name: "Notificaciones" }));

        expect(await screen.findByRole("alert")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
    });
});
