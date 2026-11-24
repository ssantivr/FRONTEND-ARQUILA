export const MIN_PASSWORD_LENGTH = 8;

const RULES: { label: string; met: (password: string) => boolean }[] = [
    {
        label: `${MIN_PASSWORD_LENGTH} caracteres o más`,
        met: (p) => p.length >= MIN_PASSWORD_LENGTH,
    },
    { label: "Letras y números", met: (p) => /\p{L}/u.test(p) && /\d/.test(p) },
    { label: "Al menos 4 caracteres distintos", met: (p) => new Set(p).size >= 4 },
];

export function passwordIsStrong(password: string): boolean {
    return RULES.every((rule) => rule.met(password));
}

/** The rules the API enforces (R03), checked while the user types. */
export function PasswordRules({ password, id }: { password: string; id?: string }) {
    return (
        <ul id={id} className="password-rules" aria-label="Requisitos de la contraseña">
            {RULES.map((rule) => {
                const met = rule.met(password);

                return (
                    <li key={rule.label} className={met ? "rule-met" : undefined}>
                        <span aria-hidden="true">{met ? "✓" : "•"}</span> {rule.label}
                        <span className="visually-hidden">
                            {met ? ": cumplido" : ": pendiente"}
                        </span>
                    </li>
                );
            })}
        </ul>
    );
}
