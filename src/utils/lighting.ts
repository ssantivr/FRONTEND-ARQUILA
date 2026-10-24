export type SkyChoice = "auto" | "day" | "sunset" | "night";
export type SkyKind = Exclude<SkyChoice, "auto">;

/** What the lighting screen lets the user set. It is kept per project, in this browser. */
export interface LightingSettings {
    /** Hour of the day, from 0 to 24: local time of the site when it has coordinates. */
    hour: number;
    /** Day of the year, as `YYYY-MM-DD`. It only moves the sun when the site has coordinates. */
    date: string;
    /**
     * Where north lies, in degrees clockwise from the back of the lot. Without coordinates it
     * turns the plain arc of the sun around the model.
     */
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

function today(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    return `${now.getFullYear()}-${month}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Presentation light: a mid-morning sun, with shadows, today. */
export const PRESENTATION_LIGHTING: LightingSettings = {
    hour: 10,
    date: today(),
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
    date: PRESENTATION_LIGHTING.date,
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

/** Where a lot is on the globe, in decimal degrees (south and west negative). */
export interface SolarSite {
    latitude: number;
    longitude: number;
}

/**
 * The hours of the clock at a site: the time zone its longitude falls in (15° an hour). The API
 * keeps no time zone, so where the official hour differs from that, the sun is off by the
 * difference.
 */
export function utcOffsetOf(site: SolarSite): number {
    // «|| 0»: just west of Greenwich the rounding gives −0.
    return Math.round(site.longitude / 15) || 0;
}

function dayOfYear(date: string): number {
    const [year, month, day] = date.split("-").map(Number);

    return Math.floor((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 86_400_000) + 1;
}

/**
 * The real sun over a site (NOAA's general solar position equations, within a degree or so):
 * its height over the horizon and its azimuth, clockwise from north, at a local hour of a date.
 */
export function solarPosition(
    site: SolarSite,
    date: string,
    hour: number,
): { elevation: number; azimuth: number } {
    const rad = Math.PI / 180;
    const gamma = ((2 * Math.PI) / 365) * (dayOfYear(date) - 1 + (hour - 12) / 24);
    const equationOfTime =
        229.18 *
        (0.000075 +
            0.001868 * Math.cos(gamma) -
            0.032077 * Math.sin(gamma) -
            0.014615 * Math.cos(2 * gamma) -
            0.040849 * Math.sin(2 * gamma));
    const declination =
        0.006918 -
        0.399912 * Math.cos(gamma) +
        0.070257 * Math.sin(gamma) -
        0.006758 * Math.cos(2 * gamma) +
        0.000907 * Math.sin(2 * gamma) -
        0.002697 * Math.cos(3 * gamma) +
        0.00148 * Math.sin(3 * gamma);
    const solarMinutes = hour * 60 + equationOfTime + 4 * site.longitude - 60 * utcOffsetOf(site);
    const hourAngle = (solarMinutes / 4 - 180) * rad;
    const latitude = site.latitude * rad;
    const elevation = Math.asin(
        Math.sin(latitude) * Math.sin(declination) +
            Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle),
    );
    const fromSouth = Math.atan2(
        Math.sin(hourAngle),
        Math.cos(hourAngle) * Math.sin(latitude) - Math.tan(declination) * Math.cos(latitude),
    );

    return {
        elevation: elevation / rad,
        azimuth: (((fromSouth / rad + 180) % 360) + 360) % 360,
    };
}

/** Under the first height the light is the dusk's; under the second, it is night. */
const DUSK_ELEVATION = 8;
const NIGHT_ELEVATION = -4;
// The engine's light points this way before it is turned: from the left and the front.
const ENGINE_BASE_ANGLE = Math.atan2(-0.5, 0.6) * (180 / Math.PI);

/**
 * The turn the engine needs to light the model from a compass azimuth, with north at
 * `orientation` degrees clockwise from the back of the lot (the scene's −Z).
 */
export function engineAzimuth(azimuth: number, orientation: number): number {
    return 180 - (orientation + azimuth) - ENGINE_BASE_ANGLE;
}

/** The sky an hour asks for: night outside the day, a sunset near its two ends. */
export function skyAt(hour: number, site: SolarSite | null = null, date = today()): SkyKind {
    if (site === null) {
        if (hour < SUNRISE - TWILIGHT_HOURS / 2 || hour > SUNSET + TWILIGHT_HOURS / 2) {
            return "night";
        }

        return hour < SUNRISE + TWILIGHT_HOURS || hour > SUNSET - TWILIGHT_HOURS ? "sunset" : "day";
    }

    const { elevation } = solarPosition(site, date, hour);

    return elevation < NIGHT_ELEVATION ? "night" : elevation < DUSK_ELEVATION ? "sunset" : "day";
}

export function skyOf(settings: LightingSettings, site: SolarSite | null = null): SkyKind {
    return settings.sky === "auto" ? skyAt(settings.hour, site, settings.date) : settings.sky;
}

interface SunPosition {
    /** Height the light is drawn at, in degrees. */
    elevation: number;
    /** Turn of the light around the model, as the engine takes it. */
    azimuth: number;
    /** The true sun, when the site has coordinates: its height and compass azimuth. */
    solar: { elevation: number; azimuth: number } | null;
}

/**
 * Where the light comes from. With the site's coordinates it is the real sun of that date and
 * hour; without them, a plain arc from 6:00 to 18:00. At night the light is the moon, at a
 * fixed height, across the sky from the sun.
 */
export function sunPosition(
    settings: LightingSettings,
    site: SolarSite | null = null,
): SunPosition {
    const night = skyOf(settings, site) === "night";

    if (site === null) {
        const azimuth = settings.orientation + (settings.hour - 12) * DEGREES_PER_HOUR;

        if (night) {
            return { elevation: MOON_ELEVATION, azimuth, solar: null };
        }

        const arc = Math.sin((Math.PI * (settings.hour - SUNRISE)) / (SUNSET - SUNRISE));

        return {
            elevation: Math.max(NOON_ELEVATION * arc, LOWEST_ELEVATION),
            azimuth,
            solar: null,
        };
    }

    const solar = solarPosition(site, settings.date, settings.hour);

    if (night) {
        return {
            elevation: MOON_ELEVATION,
            azimuth: engineAzimuth(solar.azimuth + 180, settings.orientation),
            solar,
        };
    }

    return {
        // A sun on the horizon would light only the edges: it is drawn a little higher.
        elevation: Math.max(solar.elevation, LOWEST_ELEVATION / 3),
        azimuth: engineAzimuth(solar.azimuth, settings.orientation),
        solar,
    };
}

/** A compass point in Spanish, from an azimuth clockwise from north. */
export function compassPoint(azimuth: number): string {
    const points = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];

    return points[Math.round((((azimuth % 360) + 360) % 360) / 45) % 8];
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
        date:
            typeof raw.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date)
                ? raw.date
                : PRESENTATION_LIGHTING.date,
        orientation: number("orientation"),
        intensity: number("intensity"),
        temperature: number("temperature"),
        exposure: number("exposure"),
        clouds: number("clouds"),
        shadows: typeof raw.shadows === "boolean" ? raw.shadows : PRESENTATION_LIGHTING.shadows,
        sky: raw.sky === "day" || raw.sky === "sunset" || raw.sky === "night" ? raw.sky : "auto",
    };
}
