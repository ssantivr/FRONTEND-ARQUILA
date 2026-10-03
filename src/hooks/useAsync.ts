import { useCallback, useEffect, useState, type DependencyList } from "react";

import { translateError } from "../utils/errors";

interface AsyncState<T> {
    data: T | null;
    error: string | null;
    loading: boolean;
    reload: () => void;
}

export function useAsync<T>(loader: () => Promise<T>, deps: DependencyList): AsyncState<T> {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [version, setVersion] = useState(0);

    useEffect(() => {
        let cancelled = false;

        setLoading(true);

        loader()
            .then((result) => {
                if (!cancelled) {
                    setData(result);
                    setError(null);
                }
            })
            .catch((reason: unknown) => {
                if (!cancelled) {
                    setError(errorMessage(reason));
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [...deps, version]);

    const reload = useCallback(() => setVersion((current) => current + 1), []);

    return { data, error, loading, reload };
}

export function errorMessage(reason: unknown): string {
    return translateError(reason instanceof Error ? reason.message : "Unexpected error");
}
