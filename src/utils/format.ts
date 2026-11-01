const numberFormat = new Intl.NumberFormat("es", {
    maximumFractionDigits: 2,
    useGrouping: "always",
});
const moneyFormat = new Intl.NumberFormat("es", {
    style: "currency",
    currency: "USD",
    useGrouping: "always",
});

const dateFormat = new Intl.DateTimeFormat("es", { dateStyle: "medium" });
const dateTimeFormat = new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" });

export function formatDate(value: string): string {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? "—" : dateFormat.format(date);
}

/** The day and the hour, for records where several can happen on one day (history, versions). */
export function formatDateTime(value: string): string {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? "—" : dateTimeFormat.format(date);
}

const longDayFormat = new Intl.DateTimeFormat("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
});

/** The day in words, for a greeting: «sábado, 31 de octubre». */
export function formatLongDay(date: Date): string {
    return longDayFormat.format(date);
}

const relativeFormat = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
];

/** How long ago, for a list of recent changes: «hace 2 horas», «ayer». */
export function formatRelative(value: string, now: Date = new Date()): string {
    const time = new Date(value).getTime();

    if (Number.isNaN(time)) {
        return "—";
    }

    const seconds = Math.round((time - now.getTime()) / 1000);

    for (const [unit, size] of RELATIVE_UNITS) {
        if (Math.abs(seconds) >= size) {
            return relativeFormat.format(Math.trunc(seconds / size), unit);
        }
    }

    return "hace un momento";
}

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

/** A `YYYY-MM-DD` day as `DD/MM/YYYY`, without going through a time zone. */
export function formatDay(day: string): string {
    const [year, month, date] = day.split("-");

    return `${date}/${month}/${year}`;
}

/** Today as a `YYYY-MM-DD` day of the user's calendar, like the dates of a task. */
export function localDay(now = new Date()): string {
    const pad = (value: number) => String(value).padStart(2, "0");

    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
