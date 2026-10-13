export type SkyChoice = "auto" | "day" | "sunset" | "night";
export type SkyKind = Exclude<SkyChoice, "auto">;

/** What the lighting screen lets the user set. It is kept per project, in this browser. */
export interface LightingSettings {
    /** Hour of the day, from 0 to 24. */
    hour: number;
    /** Turns the whole path of the sun around the model, in degrees. */
    orientation: number;
    /** Multiplies the power of the sun; 1 leaves it as it is. */
    intensity: number;
    /** Colour temperature of the sun, in kelvin. */
    temperature: number;
    exposure: number;
    shadows: boolean;
    sky: SkyChoice;
    /** Cloud cover, from 0 to 100. */
    clouds: number;
}

export const LIGHTING_LIMITS = {
    hour: { min: 0, max: 24, step: 0.25 },
    orientation: { min: 0, max: 355, step: 5 },
    intensity: { min: 0.2, max: 2, step: 0.05 },
    temperature: { min: 2500, max: 9000, step: 100 },
    exposure: { min: 0.4, max: 2, step: 0.05 },
    clouds: { min: 0, max: 100, step: 5 },
} as const;

/** Presentation light: a mid-morning sun, with shadows. */
export const PRESENTATION_LIGHTING: LightingSettings = {
    hour: 10,
    orientation: 0,
    intensity: 1,
    temperature: 5600,
    exposure: 1,
    shadows: true,
    sky: "auto",
    clouds: 0,
};

/** Working light: high, neutral and without shadows, so that nothing is hidden in the dark. */
export const WORK_LIGHTING: LightingSettings = {
    hour: 12,
    orientation: 0,
    intensity: 0.8,
    temperature: 6500,
    exposure: 1.15,
    shadows: false,
    sky: "day",
    clouds: 60,
};

const SUNRISE = 6;
const SUNSET = 18;
const NOON_ELEVATION = 68;
const LOWEST_ELEVATION = 9;
const MOON_ELEVATION = 42;
const TWILIGHT_HOURS = 1.25;
const DEGREES_PER_HOUR = 15;

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/** The sky an hour asks for: night outside the day, a sunset near its two ends. */
export function skyAt(hour: number): SkyKind {
    if (hour < SUNRISE - TWILIGHT_HOURS / 2 || hour > SUNSET + TWILIGHT_HOURS / 2) {
        return "night";
    }

    return hour < SUNRISE + TWILIGHT_HOURS || hour > SUNSET - TWILIGHT_HOURS ? "sunset" : "day";
}

export function skyOf(settings: LightingSettings): SkyKind {
    return settings.sky === "auto" ? skyAt(settings.hour) : settings.sky;
}

/**
 * Where the light comes from, in degrees: how high above the horizon and how far around the
 * model. The project has no latitude or date, so this is a plain arc from 6:00 to 18:00 and not
 * a solar calculation; at night the light is the moon, at a fixed height.
 */
export function sunPosition(settings: LightingSettings): { elevation: number; azimuth: number } {
    const azimuth = settings.orientation + (settings.hour - 12) * DEGREES_PER_HOUR;

    if (skyOf(settings) === "night") {
        return { elevation: MOON_ELEVATION, azimuth };
    }

    const arc = Math.sin((Math.PI * (settings.hour - SUNRISE)) / (SUNSET - SUNRISE));

    return { elevation: Math.max(NOON_ELEVATION * arc, LOWEST_ELEVATION), azimuth };
}

/** Colour of a black body at a temperature, as 0xRRGGBB (Tanner Helland's approximation). */
export function kelvinToHex(kelvin: number): number {
    const t = clamp(kelvin, 1000, 40000) / 100;
    const red = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
    const green =
        t <= 66
            ? 99.4708025861 * Math.log(t) - 161.1195681661
            : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    const blue = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
    const channel = (value: number) => Math.round(clamp(value, 0, 255));

    return (channel(red) << 16) | (channel(green) << 8) | channel(blue);
}

export function formatHour(hour: number): string {
    const minutes = Math.round(hour * 60) % (24 * 60);

    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Reads settings that came from storage: anything missing or out of range falls back. */
export function readLighting(value: unknown): LightingSettings {
    const raw = (typeof value === "object" && value !== null ? value : {}) as Record<
        string,
        unknown
    >;
    const number = (key: keyof typeof LIGHTING_LIMITS) => {
        const found = raw[key];
        const { min, max } = LIGHTING_LIMITS[key];

        return typeof found === "number" && Number.isFinite(found)
            ? clamp(found, min, max)
            : PRESENTATION_LIGHTING[key];
    };

    return {
        hour: number("hour"),
        orientation: number("orientation"),
        intensity: number("intensity"),
        temperature: number("temperature"),
        exposure: number("exposure"),
        clouds: number("clouds"),
        shadows: typeof raw.shadows === "boolean" ? raw.shadows : PRESENTATION_LIGHTING.shadows,
        sky: raw.sky === "day" || raw.sky === "sunset" || raw.sky === "night" ? raw.sky : "auto",
    };
}
