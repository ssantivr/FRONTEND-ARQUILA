export function AuthShowcase() {
    return (
        <aside className="auth-showcase" aria-label="ARQUILA">
            <div className="auth-showcase-mark" aria-hidden="true">
                <span />
            </div>
            <div className="auth-showcase-visual" aria-hidden="true">
                <span>ESTUDIO / 01</span>
                <svg viewBox="0 0 420 300" focusable="false">
                    <path d="M25 218 205 113l190 76-180 104z" />
                    <path d="m205 113 0 103m190-27v-87l-190-76L25 131v87" />
                    <path d="m111 168 95-55 104 42-96 57z" />
                    <path d="m111 168v49l103 43v-48m0 0 96-57v51l-96 54" />
                    <path d="m157 142 102 43v48m-77-58v50m21-62v51m21-42v50m21-62v50m22-41v50" />
                    <path d="m111 190 103 43 96-56m-180-30 98 46 83-48" />
                    <path d="M48 251h70m198 28h55M56 59h72m-36-36v72" />
                    <circle cx="345" cy="72" r="13" />
                    <circle cx="345" cy="72" r="3" />
                </svg>
            </div>
            <div className="auth-showcase-copy">
                <span className="eyebrow">PLATAFORMA BIM</span>
                <h2>
                    Diseña con contexto.
                    <br />
                    Construye con precisión.
                </h2>
                <p>
                    Terrenos, planos, estructuras y modelos 3D reunidos en un solo flujo de trabajo.
                </p>
            </div>
            <ul className="auth-feature-list" aria-label="Funciones principales">
                <li>
                    <span>01</span> Proyecto y ubicación
                </li>
                <li>
                    <span>02</span> Modelo 3D inteligente
                </li>
                <li>
                    <span>03</span> Asistente con datos reales
                </li>
            </ul>
        </aside>
    );
}
