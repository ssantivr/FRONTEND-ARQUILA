import { useId, useState } from "react";

interface PasswordInputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    autoComplete: "current-password" | "new-password";
    minLength?: number;
    /** Hides the password again, for instance while the form is being sent. */
    concealed?: boolean;
    describedBy?: string;
}

const EYE = "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z";

export function PasswordInput({
    label,
    value,
    onChange,
    autoComplete,
    minLength,
    concealed = false,
    describedBy,
}: PasswordInputProps) {
    const id = useId();
    const [visible, setVisible] = useState(false);

    if (concealed && visible) {
        setVisible(false);
    }

    return (
        <div className="field">
            <label htmlFor={id}>{label}</label>
            <div className="password-field">
                <input
                    id={id}
                    type={visible ? "text" : "password"}
                    value={value}
                    minLength={minLength}
                    maxLength={128}
                    autoComplete={autoComplete}
                    aria-describedby={describedBy}
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    onChange={(event) => onChange(event.target.value)}
                />
                <button
                    type="button"
                    className="password-toggle"
                    aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
                    aria-pressed={visible}
                    onClick={() => setVisible((shown) => !shown)}
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <path d={EYE} />
                        <circle cx="12" cy="12" r="3" />
                        {visible && <path d="M4 4l16 16" />}
                    </svg>
                </button>
            </div>
        </div>
    );
}
