import { useEffect, useState } from "react";

import { Panel } from "./components/Panel";
import { errorMessage } from "./hooks/useAsync";
import { LoginPage } from "./pages/LoginPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { authApi } from "./services/api";
import { ApiError } from "./services/http";
import type { User } from "./types/api";

type Session =
    | { state: "loading" }
    | { state: "anonymous" }
    | { state: "error"; message: string }
    | { state: "authenticated"; user: User };

export function App() {
    const [session, setSession] = useState<Session>({ state: "loading" });
    const [projectId, setProjectId] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;

        authApi
            .me()
            .then((user) => {
                if (!cancelled) {
                    setSession({ state: "authenticated", user });
                }
            })
            .catch((reason: unknown) => {
                if (cancelled) {
                    return;
                }

                if (reason instanceof ApiError && reason.status === 401) {
                    setSession({ state: "anonymous" });
                } else {
                    setSession({ state: "error", message: errorMessage(reason) });
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    async function handleLogout() {
        try {
            await authApi.logout();
        } finally {
            setProjectId(null);
            setSession({ state: "anonymous" });
        }
    }

    return (
        <div className="layout">
            <header className="header">
                <span className="brand">ARQUILA</span>
                {session.state === "authenticated" && (
                    <div className="user-menu">
                        <span>{session.user.name}</span>
                        <button type="button" className="button-secondary" onClick={handleLogout}>
                            Cerrar sesión
                        </button>
                    </div>
                )}
            </header>

            <main className="content">
                {session.state === "loading" && (
                    <Panel title="ARQUILA">
                        <p className="message">Cargando…</p>
                    </Panel>
                )}
                {session.state === "error" && (
                    <Panel title="Conexión con la API">
                        <p className="message message-error" role="alert">
                            {session.message}
                        </p>
                    </Panel>
                )}
                {session.state === "anonymous" && (
                    <LoginPage
                        onAuthenticated={(user) => setSession({ state: "authenticated", user })}
                    />
                )}
                {session.state === "authenticated" &&
                    (projectId === null ? (
                        <ProjectsPage onOpenProject={setProjectId} />
                    ) : (
                        <ProjectDetailPage
                            projectId={projectId}
                            onBack={() => setProjectId(null)}
                        />
                    ))}
            </main>
        </div>
    );
}
