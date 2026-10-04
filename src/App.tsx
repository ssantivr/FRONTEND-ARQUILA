import { useEffect, useState } from "react";

import { Panel } from "./components/Panel";
import { Sidebar, type View } from "./components/Sidebar";
import { errorMessage } from "./hooks/useAsync";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { MaterialsPage } from "./pages/MaterialsPage";
import { ProjectDetailPage, type SectionId } from "./pages/ProjectDetailPage";
import { ProjectToolPage } from "./pages/ProjectToolPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TerrainsPage } from "./pages/TerrainsPage";
import { authApi } from "./services/api";
import { setTheme, useTheme } from "./state/theme";
import { ApiError, SESSION_ENDED_EVENT } from "./services/http";
import type { User } from "./types/api";

type Session =
    | { state: "loading" }
    | { state: "anonymous" }
    | { state: "error"; message: string }
    | { state: "authenticated"; user: User };

interface OpenProject {
    id: number;
    section: SectionId;
}

export function App() {
    const [session, setSession] = useState<Session>({ state: "loading" });
    const [view, setView] = useState<View>("home");
    const [project, setProject] = useState<OpenProject | null>(null);
    const [resetToken, setResetToken] = useState(() =>
        new URLSearchParams(window.location.search).get("reset_token"),
    );
    const [loginNotice, setLoginNotice] = useState<string | undefined>(undefined);
    const theme = useTheme();

    useEffect(() => {
        if (new URLSearchParams(window.location.search).has("reset_token")) {
            window.history.replaceState(null, "", window.location.pathname);
        }
    }, []);

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
            setProject(null);
            setView("home");
            setSession({ state: "anonymous" });
        }

        window.addEventListener(SESSION_ENDED_EVENT, handleSessionEnded);

        return () => window.removeEventListener(SESSION_ENDED_EVENT, handleSessionEnded);
    }, []);

    async function handleLogout() {
        try {
            await authApi.logout();
        } catch {
        } finally {
            setProject(null);
            setView("home");
            setSession({ state: "anonymous" });
        }
    }

    function handleResetDone(changed: boolean) {
        window.history.replaceState(null, "", window.location.pathname);
        setResetToken(null);
        setProject(null);
        setLoginNotice(
            changed ? "Contraseña cambiada. Ya puedes iniciar sesión con la nueva." : undefined,
        );
        setSession({ state: "anonymous" });
    }

    function navigate(next: View) {
        setProject(null);
        setView(next);
    }

    function openProject(id: number, section: SectionId = "terrain") {
        setView("projects");
        setProject({ id, section });
    }

    function renderView(user: User) {
        if (project !== null) {
            return (
                <ProjectDetailPage
                    key={project.id}
                    projectId={project.id}
                    initialSection={project.section}
                    onBack={() => setProject(null)}
                />
            );
        }

        switch (view) {
            case "home":
                return <HomePage user={user} onOpenProject={openProject} onNavigate={navigate} />;
            case "projects":
                return (
                    <ProjectsPage
                        onOpenProject={openProject}
                        onOpenModel={(id) => openProject(id, "model")}
                    />
                );
            case "terrains":
                return <TerrainsPage onOpenProject={(id) => openProject(id, "terrain")} />;
            case "materials":
                return <MaterialsPage onOpenProject={(id) => openProject(id, "materials")} />;
            case "viewer":
                return (
                    <ProjectToolPage
                        key="viewer"
                        tool="viewer"
                        onOpenProject={(id) => openProject(id, "model")}
                    />
                );
            case "assistant":
                return (
                    <ProjectToolPage
                        key="assistant"
                        tool="assistant"
                        onOpenProject={(id) => openProject(id, "assistant")}
                    />
                );
            case "settings":
                return <SettingsPage user={user} onLogout={handleLogout} />;
        }
    }

    return (
        <div className="layout">
            <a className="skip-link" href="#content">
                Saltar al contenido
            </a>
            <header className="header">
                <span className="brand">ARQUILA</span>
                <div className="user-menu">
                    <button
                        type="button"
                        className="button-secondary"
                        aria-pressed={theme === "dark"}
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    >
                        {theme === "dark" ? "Modo claro" : "Modo oscuro"}
                    </button>
                    {session.state === "authenticated" && (
                        <>
                            <span>{session.user.name}</span>
                            <button
                                type="button"
                                className="button-secondary"
                                onClick={handleLogout}
                            >
                                Cerrar sesión
                            </button>
                        </>
                    )}
                </div>
            </header>

            {resetToken !== null ? (
                <main id="content" className="content" tabIndex={-1}>
                    <ResetPasswordPage token={resetToken} onDone={handleResetDone} />
                </main>
            ) : session.state === "authenticated" ? (
                <div className="shell">
                    <Sidebar current={view} onNavigate={navigate} />
                    <main id="content" className="content" tabIndex={-1}>
                        {renderView(session.user)}
                    </main>
                </div>
            ) : (
                <main id="content" className="content" tabIndex={-1}>
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
                            notice={loginNotice}
                            onAuthenticated={(user) => {
                                setLoginNotice(undefined);
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
