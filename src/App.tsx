import { Suspense, lazy, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import { RenderImage } from "./components/RenderImage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { GlobalSearch } from "./components/GlobalSearch";
import { Icon } from "./components/Icon";
import { Panel } from "./components/Panel";
import { Toasts } from "./components/Toasts";
import { MODULES, Sidebar, type View } from "./components/Sidebar";
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
import { parsePath, projectPath, viewPath } from "./routes";
import { authApi } from "./services/api";
import { setTheme, useTheme } from "./state/theme";
import { ApiError, SESSION_ENDED_EVENT } from "./services/http";
import type { User } from "./types/api";

const InteriorPage = lazy(() =>
    import("./pages/InteriorPage").then((module) => ({ default: module.InteriorPage })),
);

// The design system page is a development tool: the production build leaves it out.
const DesignSystemPage = import.meta.env.DEV
    ? lazy(() =>
          import("./pages/DesignSystemPage").then((module) => ({
              default: module.DesignSystemPage,
          })),
      )
    : null;

const SIDEBAR_KEY = "arquila:sidebar";

type Session =
    | { state: "loading" }
    | { state: "anonymous" }
    | { state: "error"; message: string }
    | { state: "authenticated"; user: User };

export function App() {
    const [session, setSession] = useState<Session>({ state: "loading" });
    const location = useLocation();
    const go = useNavigate();
    const route = parsePath(location.pathname);
    const project = route.kind === "project" ? route : null;
    const view: View | null =
        route.kind === "view" ? route.view : project !== null ? "projects" : null;
    const [resetToken, setResetToken] = useState(() =>
        new URLSearchParams(window.location.search).get("reset_token"),
    );
    const [loginNotice, setLoginNotice] = useState<string | undefined>(undefined);
    const theme = useTheme();
    const [collapsed, setCollapsed] = useState(
        () => window.localStorage.getItem(SIDEBAR_KEY) === "collapsed",
    );

    function toggleSidebar() {
        setCollapsed((previous) => {
            window.localStorage.setItem(SIDEBAR_KEY, previous ? "expanded" : "collapsed");

            return !previous;
        });
    }

    const screenName =
        session.state !== "authenticated"
            ? null
            : project !== null
              ? "Proyecto"
              : (MODULES.find((item) => item.id === view)?.label ?? null);

    useEffect(() => {
        document.title = screenName === null ? "ARQUILA" : `${screenName} · ARQUILA`;
    }, [screenName]);

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
        // The address stays as it is, so signing in again returns to the same screen.
        function handleSessionEnded() {
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
            go(viewPath("home"));
            setSession({ state: "anonymous" });
        }
    }

    function handleResetDone(changed: boolean) {
        window.history.replaceState(null, "", window.location.pathname);
        setResetToken(null);
        setLoginNotice(
            changed ? "Contraseña cambiada. Ya puedes iniciar sesión con la nueva." : undefined,
        );
        setSession({ state: "anonymous" });
    }

    function navigate(next: View) {
        go(viewPath(next));
    }

    function openProject(id: number, section: SectionId = "terrain") {
        go(projectPath(id, section));
    }

    function renderView(user: User) {
        if (project !== null) {
            return (
                <ProjectDetailPage
                    key={project.id}
                    projectId={project.id}
                    initialSection={project.section}
                    onSectionChange={(section) => go(projectPath(project.id, section))}
                    onBack={() => navigate("projects")}
                />
            );
        }

        if (route.kind === "design-system" && DesignSystemPage !== null) {
            return (
                <Suspense fallback={<p className="message">Cargando…</p>}>
                    <DesignSystemPage />
                </Suspense>
            );
        }

        if (view === null) {
            return (
                <Panel title="Página no encontrada">
                    <p className="message">
                        La dirección <code>{location.pathname}</code> no corresponde a ninguna
                        pantalla de ARQUILA.
                    </p>
                    <button type="button" onClick={() => navigate("home")}>
                        Ir al inicio
                    </button>
                </Panel>
            );
        }

        switch (view) {
            case "home":
                return <HomePage user={user} onOpenProject={openProject} onNavigate={navigate} />;
            case "projects":
                return (
                    <ProjectsPage
                        key={location.key}
                        focusCreate={
                            (location.state as { create?: boolean } | null)?.create === true
                        }
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
            case "interior":
                return (
                    <>
                        <ProjectToolPage
                            key="interior"
                            tool="interior"
                            onOpenProject={(id) => openProject(id, "model")}
                        />
                        <Suspense fallback={<p className="message">Cargando…</p>}>
                            <InteriorPage />
                        </Suspense>
                    </>
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

    const themeToggle = (
        <button
            type="button"
            className="button-secondary icon-button"
            aria-pressed={theme === "dark"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
            <Icon name={theme === "dark" ? "sun" : "moon"} />
            {theme === "dark" ? "Modo claro" : "Modo oscuro"}
        </button>
    );

    if (resetToken === null && session.state === "authenticated") {
        const current = MODULES.find((item) => item.id === view);

        return (
            <div className={collapsed ? "shell shell-collapsed" : "shell"}>
                <a className="skip-link" href="#content">
                    Saltar al contenido
                </a>
                <Sidebar
                    current={view}
                    onNavigate={navigate}
                    collapsed={collapsed}
                    onToggle={toggleSidebar}
                    onLogout={handleLogout}
                    user={session.user}
                />
                <div className="workspace">
                    <header className="header">
                        <div>
                            <p className="header-eyebrow">ARQUILA</p>
                            <h1>
                                {current?.label ??
                                    (route.kind === "design-system"
                                        ? "Sistema de diseño"
                                        : "ARQUILA")}
                            </h1>
                        </div>
                        <GlobalSearch onOpenProject={(id) => openProject(id)} />
                        <div className="user-menu">
                            <button
                                type="button"
                                className={
                                    view === "projects" && project === null
                                        ? "button-secondary icon-button"
                                        : "button-lime icon-button"
                                }
                                onClick={() =>
                                    go(viewPath("projects"), { state: { create: true } })
                                }
                            >
                                <Icon name="plus" />
                                Nuevo proyecto
                            </button>
                            {themeToggle}
                            <button
                                type="button"
                                className="button-secondary icon-button"
                                title="Abrir tu cuenta y la configuración"
                                onClick={() => navigate("settings")}
                            >
                                <span className="avatar" aria-hidden="true">
                                    {session.user.name.trim().charAt(0).toUpperCase()}
                                </span>
                                {session.user.name}
                            </button>
                        </div>
                    </header>
                    <main id="content" className="content" tabIndex={-1}>
                        <ErrorBoundary
                            key={`${view ?? location.pathname}-${project?.id ?? "none"}`}
                        >
                            {renderView(session.user)}
                        </ErrorBoundary>
                    </main>
                </div>
                <Toasts />
            </div>
        );
    }

    if (resetToken === null && session.state === "anonymous") {
        return (
            <main id="content" className="auth" tabIndex={-1}>
                <section className="auth-visual" aria-label="ARQUILA">
                    <RenderImage place="auth" />
                    <span className="brand">ARQUILA</span>
                    <div>
                        <h2>Diseña, organiza y visualiza tu arquitectura.</h2>
                        <p>
                            Proyectos, terrenos, planos, materiales y modelo 3D en un solo espacio
                            de trabajo.
                        </p>
                        <ul className="auth-features">
                            <li>
                                <Icon name="viewer" />
                                <span>
                                    <strong>Modelo 3D</strong>
                                    Se arma con los terrenos, planos y cuartos del proyecto.
                                </span>
                            </li>
                            <li>
                                <Icon name="projects" />
                                <span>
                                    <strong>Planos con cotas</strong>
                                    Plantas, fachadas e implantación, descargables en SVG.
                                </span>
                            </li>
                            <li>
                                <Icon name="materials" />
                                <span>
                                    <strong>Costos</strong>
                                    Materiales por proyecto y su costo por categoría.
                                </span>
                            </li>
                        </ul>
                    </div>
                </section>
                <section className="auth-form">
                    <LoginPage
                        notice={loginNotice}
                        onAuthenticated={(user) => {
                            setLoginNotice(undefined);
                            setSession({ state: "authenticated", user });
                        }}
                    />
                    {themeToggle}
                </section>
            </main>
        );
    }

    return (
        <div className="layout">
            <a className="skip-link" href="#content">
                Saltar al contenido
            </a>
            <header className="header">
                <span className="brand">ARQUILA</span>
                <div className="user-menu">{themeToggle}</div>
            </header>

            {resetToken !== null ? (
                <main id="content" className="content" tabIndex={-1}>
                    <ResetPasswordPage token={resetToken} onDone={handleResetDone} />
                </main>
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
                </main>
            )}
        </div>
    );
}
