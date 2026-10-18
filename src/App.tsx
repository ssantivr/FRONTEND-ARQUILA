import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import {
    useLocation,
    useNavigate,
    type NavigateFunction,
    type NavigateOptions,
    type To,
} from "react-router";

import { AuthScreen } from "./components/AuthScreen";
import { CommandPalette, type Command } from "./components/CommandPalette";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Icon } from "./components/Icon";
import { MobileNav } from "./components/MobileNav";
import { Panel } from "./components/ui/Panel";
import { Skeleton } from "./components/ui/Skeleton";
import { Toasts } from "./components/Toasts";
import { MODULES, Sidebar, type View } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { errorMessage } from "./hooks/useAsync";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { SECTIONS, type SectionId } from "./pages/sections";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { canonicalPath, parsePath, projectPath, viewPath } from "./routes";
import { authApi } from "./services/api";
import { setTheme, useTheme } from "./state/theme";
import { TopBarSlotProvider } from "./state/topBarSlot";
import { withViewTransition } from "./state/viewTransition";
import { ApiError, SESSION_ENDED_EVENT } from "./services/http";
import type { User } from "./types/api";

// Only the screens someone lands on (home, sign-in, the list of projects) come with the app.
// Each of the others is a file of its own that the browser asks for when it is opened, so the
// first load does not carry the plans, the charts or the geometry of screens not yet visited.
function page<Name extends string, Props>(
    load: () => Promise<Record<Name, React.ComponentType<Props>>>,
    name: Name,
) {
    return lazy(() => load().then((module) => ({ default: module[name] })));
}

const ProjectDetailPage = page(() => import("./pages/ProjectDetailPage"), "ProjectDetailPage");
const LightingPage = page(() => import("./pages/LightingPage"), "LightingPage");
const MaterialsPage = page(() => import("./pages/MaterialsPage"), "MaterialsPage");
const PlansPage = page(() => import("./pages/PlansPage"), "PlansPage");
const ProjectToolPage = page(() => import("./pages/ProjectToolPage"), "ProjectToolPage");
const RenderPage = page(() => import("./pages/RenderPage"), "RenderPage");
const SettingsPage = page(() => import("./pages/SettingsPage"), "SettingsPage");
const TasksPage = page(() => import("./pages/TasksPage"), "TasksPage");
const TerrainsPage = page(() => import("./pages/TerrainsPage"), "TerrainsPage");

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
    const navigateTo = useNavigate();
    // Every change of screen made from the app goes through a view transition where it exists.
    const go = useCallback<NavigateFunction>(
        ((to: To | number, options?: NavigateOptions) => {
            withViewTransition(() => {
                if (typeof to === "number") {
                    void navigateTo(to);
                } else {
                    void navigateTo(to, options);
                }
            });
        }) as NavigateFunction,
        [navigateTo],
    );
    const route = parsePath(location.pathname);
    const project = route.kind === "project" ? route : null;
    const view: View | null =
        route.kind === "view" ? route.view : project !== null ? "projects" : null;
    const [resetToken, setResetToken] = useState(() =>
        new URLSearchParams(window.location.search).get("reset_token"),
    );
    const [loginNotice, setLoginNotice] = useState<string | undefined>(undefined);
    const theme = useTheme();
    const [commandsOpen, setCommandsOpen] = useState(false);
    const [topBarSlot, setTopBarSlot] = useState<HTMLElement | null>(null);
    const signedIn = session.state === "authenticated" && resetToken === null;
    const canonical = canonicalPath(location.pathname);

    // An address of an earlier version, such as /proyectos/7/modelo, is replaced by the current one.
    useEffect(() => {
        if (canonical !== null) {
            go(`${canonical}${location.search}${location.hash}`, {
                replace: true,
                state: location.state,
            });
        }
    }, [canonical, go, location.search, location.hash, location.state]);

    useEffect(() => {
        if (!signedIn) {
            return;
        }

        function handleShortcut(event: KeyboardEvent) {
            if (
                (event.ctrlKey || event.metaKey) &&
                !event.altKey &&
                !event.shiftKey &&
                event.key?.toLowerCase() === "k"
            ) {
                event.preventDefault();
                setCommandsOpen((open) => !open);
            }
        }

        window.addEventListener("keydown", handleShortcut);

        return () => window.removeEventListener("keydown", handleShortcut);
    }, [signedIn]);

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

    const commands = useMemo<Command[]>(
        () => [
            ...(project === null
                ? []
                : SECTIONS.map((item) => ({
                      id: `section-${item.id}`,
                      group: "Este proyecto",
                      label: item.label,
                      icon: "chevronRight" as const,
                      run: () => go(projectPath(project.id, item.id)),
                  }))),
            ...MODULES.map((item) => ({
                id: `view-${item.id}`,
                group: "Ir a",
                label: item.label,
                icon: item.icon,
                run: () => go(viewPath(item.id)),
            })),
            {
                id: "new-project",
                group: "Acciones",
                label: "Crear un proyecto",
                icon: "plus",
                run: () => go(viewPath("projects"), { state: { create: true } }),
            },
            {
                id: "theme",
                group: "Acciones",
                label: theme === "dark" ? "Cambiar al modo claro" : "Cambiar al modo oscuro",
                icon: theme === "dark" ? "sun" : "moon",
                run: () => setTheme(theme === "dark" ? "light" : "dark"),
            },
            {
                id: "logout",
                group: "Acciones",
                label: "Cerrar sesión",
                icon: "logout",
                run: () => void handleLogout(),
            },
        ],
        [project?.id, theme, go],
    );

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
            case "plans":
                return <PlansPage onOpenProject={(id) => openProject(id, "plans")} />;
            case "lighting":
                return <LightingPage onRender={() => navigate("render")} />;
            case "render":
                return <RenderPage onLighting={() => navigate("lighting")} />;
            case "tasks":
                return <TasksPage onOpenProject={(id) => openProject(id, "model")} />;
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
                    <TopBar
                        eyebrow="ARQUILA"
                        title={
                            current?.label ??
                            (route.kind === "design-system" ? "Sistema de diseño" : "ARQUILA")
                        }
                        user={session.user}
                        onOpenProject={(id) => openProject(id)}
                        onOpenCommands={() => setCommandsOpen(true)}
                        onCreateProject={() =>
                            go(viewPath("projects"), { state: { create: true } })
                        }
                        createIsSecondary={view === "projects" && project === null}
                        onOpenSettings={() => navigate("settings")}
                        onLogout={() => void handleLogout()}
                        onSlot={setTopBarSlot}
                    />
                    <main id="content" className="content" tabIndex={-1}>
                        <ErrorBoundary
                            key={`${view ?? location.pathname}-${project?.id ?? "none"}`}
                        >
                            <Suspense
                                fallback={<Skeleton shape="cards" label="Cargando la pantalla…" />}
                            >
                                <TopBarSlotProvider value={topBarSlot}>
                                    {renderView(session.user)}
                                </TopBarSlotProvider>
                            </Suspense>
                        </ErrorBoundary>
                    </main>
                </div>
                <MobileNav
                    current={view}
                    onNavigate={navigate}
                    onLogout={() => void handleLogout()}
                    user={session.user}
                />
                {commandsOpen && (
                    <CommandPalette
                        commands={commands}
                        onOpenProject={(id) => openProject(id)}
                        onClose={() => setCommandsOpen(false)}
                    />
                )}
                <Toasts />
            </div>
        );
    }

    if (resetToken === null && session.state === "anonymous") {
        return (
            <AuthScreen>
                <LoginPage
                    notice={loginNotice}
                    onAuthenticated={(user) => {
                        setLoginNotice(undefined);
                        setSession({ state: "authenticated", user });
                    }}
                />
            </AuthScreen>
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
