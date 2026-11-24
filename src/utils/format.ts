const numberFormat = new Intl.NumberFormat("es", {
    maximumFractionDigits: 2,
    useGrouping: "always",
});
const moneyFormat = new Intl.NumberFormat("es", {
    style: "currency",
    currency: "USD",
    useGrouping: "always",
});

export function formatNumber(value: number | null): string {
    return value === null ? "—" : numberFormat.format(value);
}

export function formatMoney(value: number): string {
    return moneyFormat.format(value);
}

export function optionalText(value: string): string | undefined {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
}

export function optionalNumber(value: string): number | undefined {
    return value.trim() === "" ? undefined : Number(value);
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${numberFormat.format(bytes / 1024)} KB`;
    }

    return `${numberFormat.format(bytes / (1024 * 1024))} MB`;
}

/** Date and time in the browser's zone. The API stores UTC without an offset. */
export function formatDateTime(value: string): string {
    const utc = /[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`;
    const date = new Date(utc);

    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleString("es-EC", { dateStyle: "medium", timeStyle: "short" });
}
