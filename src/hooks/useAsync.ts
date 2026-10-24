import { useCallback, useEffect, useState, type DependencyList } from "react";

import { isUnavailable } from "../services/http";
import { translateError } from "../utils/errors";

interface AsyncState<T> {
    data: T | null;
    error: string | null;
    loading: boolean;
    /** The API in use does not have the route: a state of its own, not an error to retry. */
    unavailable: boolean;
    reload: () => void;
}

export function useAsync<T>(loader: () => Promise<T>, deps: DependencyList): AsyncState<T> {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [unavailable, setUnavailable] = useState(false);
    const [version, setVersion] = useState(0);

    useEffect(() => {
        let cancelled = false;

        setLoading(true);

        loader()
            .then((result) => {
                if (!cancelled) {
                    setData(result);
                    setError(null);
                    setUnavailable(false);
                }
            })
            .catch((reason: unknown) => {
                if (!cancelled) {
                    setError(errorMessage(reason));
                    setUnavailable(isUnavailable(reason));
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

    return { data, error, loading, unavailable, reload };
}

export function errorMessage(reason: unknown): string {
    return translateError(reason instanceof Error ? reason.message : "Unexpected error");
}
