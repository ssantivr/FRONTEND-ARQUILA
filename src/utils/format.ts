const numberFormat = new Intl.NumberFormat("es", { maximumFractionDigits: 2 });
const moneyFormat = new Intl.NumberFormat("es", {
    style: "currency",
    currency: "USD",
});

export function formatNumber(value: number | null): string {
    return value === null ? "—" : numberFormat.format(value);
}

export function formatMoney(value: number): string {
    return moneyFormat.format(value);
}

// Empty form inputs become undefined so optional API fields are omitted.
export function optionalText(value: string): string | undefined {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
}

export function optionalNumber(value: string): number | undefined {
    return value.trim() === "" ? undefined : Number(value);
}
