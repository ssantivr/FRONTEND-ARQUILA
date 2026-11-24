export interface TestAccount {
    label: string;
    email: string;
    password: string;
}

/**
 * Quick fill of the local test accounts (R02). They come from VITE_TEST_ACCOUNTS in
 * .env.development.local, never from Git, and only exist in development: a build drops them.
 * Format: "Admin|admin@example.com|password;Architect|architect@example.com|password"
 */
export const TEST_ACCOUNTS: TestAccount[] = import.meta.env.DEV
    ? (import.meta.env.VITE_TEST_ACCOUNTS ?? "")
          .split(";")
          .map((entry: string) => entry.split("|"))
          .filter((parts: string[]) => parts.length === 3 && parts.every(Boolean))
          .map(([label, email, password]: string[]) => ({ label, email, password }))
    : [];
