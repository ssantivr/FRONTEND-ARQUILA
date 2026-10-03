import { useEffect, useState, type FormEvent } from "react";

import { AsyncStatus } from "./components/AsyncStatus";
import { Panel } from "./components/Panel";
import { errorMessage, useAsync } from "./hooks/useAsync";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { usersApi } from "./services/api";

export function App() {
    const users = useAsync(() => usersApi.list(), []);
    const [userId, setUserId] = useState<number | null>(null);
    const [projectId, setProjectId] = useState<number | null>(null);

    const userList = users.data ?? [];
    const currentUser = userList.find((user) => user.id === userId) ?? null;

    // There is no authentication yet: default to the first registered user.
    useEffect(() => {
        if (currentUser === null && userList.length > 0) {
            setUserId(userList[0].id);
        }
    }, [currentUser, userList]);

    return (
        <div className="layout">
            <header className="header">
                <span className="brand">ARQUILA</span>
                {userList.length > 0 && (
                    <label className="user-picker">
                        Usuario
                        <select
                            value={userId ?? ""}
                            onChange={(event) => {
                                setUserId(Number(event.target.value));
                                setProjectId(null);
                            }}
                        >
                            {userList.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.name}
                                </option>
                            ))}
                        </select>
                    </label>
                )}
            </header>

            <main className="content">
                {users.data === null ? (
                    <Panel title="Conexión con la API">
                        <AsyncStatus
                            loading={users.loading}
                            error={users.error}
                            isEmpty
                            emptyText=""
                        />
                    </Panel>
                ) : currentUser === null ? (
                    <CreateUserPanel
                        onCreated={(id) => {
                            setUserId(id);
                            users.reload();
                        }}
                    />
                ) : projectId === null ? (
                    <ProjectsPage user={currentUser} onOpenProject={setProjectId} />
                ) : (
                    <ProjectDetailPage
                        projectId={projectId}
                        onBack={() => setProjectId(null)}
                    />
                )}
            </main>
        </div>
    );
}

function CreateUserPanel({ onCreated }: { onCreated: (userId: number) => void }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setError(null);

        try {
            const user = await usersApi.create({ name: name.trim(), email: email.trim() });
            onCreated(user.id);
        } catch (reason) {
            setError(errorMessage(reason));
        }
    }

    return (
        <Panel title="Crear el primer usuario">
            <form className="form-row" onSubmit={handleSubmit}>
                <label>
                    Nombre
                    <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        maxLength={120}
                        required
                    />
                </label>
                <label>
                    Correo
                    <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        maxLength={255}
                        required
                    />
                </label>
                <button type="submit">Crear usuario</button>
            </form>
            {error && (
                <p className="message message-error" role="alert">
                    {error}
                </p>
            )}
        </Panel>
    );
}
