import { useEffect, useState } from "react";

import { Panel } from "./components/Panel";
import { Sidebar, type View } from "./components/Sidebar";
import { errorMessage } from "./hooks/useAsync";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { authApi } from "./services/api";
import { ApiError, SESSION_ENDED_EVENT } from "./services/http";
import type { User } from "./types/api";

type Session =
    | { state: "loading" }
    | { state: "anonymous" }
    | { state: "error"; message: string }
    | { state: "authenticated"; user: User };

export function App() {
    const [session, setSession] = useState<Session>({ state: "loading" });
    const [view, setView] = useState<View>("home");
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

    useEffect(() => {
        function handleSessionEnded() {
            setProjectId(null);
            setView("home");
            setSession({ state: "anonymous" });
        }

        window.addEventListener(SESSION_ENDED_EVENT, handleSessionEnded);

        return () => window.removeEventListener(SESSION_ENDED_EVENT, handleSessionEnded);
    }, []);

    async function handleLogout() {
        try {
            await authApi.logout();
        } finally {
            setProjectId(null);
            setView("home");
            setSession({ state: "anonymous" });
        }
    }

    function navigate(next: View) {
        setProjectId(null);
        setView(next);
    }

    function openProject(id: number) {
        setView("projects");
        setProjectId(id);
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

            {session.state === "authenticated" ? (
                <div className="shell">
                    <Sidebar current={view} onNavigate={navigate} />
                    <main className="content">
                        {projectId !== null ? (
                            <ProjectDetailPage
                                projectId={projectId}
                                onBack={() => setProjectId(null)}
                            />
                        ) : view === "home" ? (
                            <HomePage
                                user={session.user}
                                onOpenProject={openProject}
                                onShowProjects={() => navigate("projects")}
                            />
                        ) : (
                            <ProjectsPage onOpenProject={openProject} />
                        )}
                    </main>
                </div>
            ) : (
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
                            onAuthenticated={(user) => {
                                setView("home");
                                setSession({ state: "authenticated", user });
                            }}
                        />
                    )}
                </main>
            )}
        </div>
    );
}
