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
