import { Color } from "three";

import {
    kelvinToHex,
    skyOf,
    sunPosition,
    type LightingSettings,
    type SolarSite,
} from "../utils/lighting";

export interface ScenePalette {
    sky: number;
    fog: number;
    ground: number;
    grid: number;
    axis: number;
    accent: number;
    glow: number;
    horizon: number;
    sun: number;
    sunPower: number;
    skyLight: number;
    skyPower: number;
    reflections: number;
    windowGlow: number;
    glassOpacity: number;
    gridOpacity: number;
    stars: boolean;
}

export const SCENE_PALETTES: Record<"light" | "dark", ScenePalette> = {
    light: {
        sky: 0x5f9fde,
        fog: 0xe8e4da,
        ground: 0xdfdace,
        grid: 0xb8b3a6,
        axis: 0x89968c,
        accent: 0,
        glow: 0,
        horizon: 0xf7eedf,
        sun: 0xffeccf,
        sunPower: 3.4,
        skyLight: 0xcfe2ff,
        skyPower: 0.62,
        reflections: 0.5,
        windowGlow: 0,
        glassOpacity: 0.5,
        gridOpacity: 0.45,
        stars: false,
    },
    // Night: moonlight, lit windows and a dusk glow on the horizon.
    dark: {
        sky: 0x0e100f,
        fog: 0x121413,
        ground: 0x171918,
        grid: 0x303432,
        axis: 0x5a625c,
        accent: 0,
        glow: 1,
        horizon: 0x2b2f2d,
        sun: 0x9fb6ff,
        sunPower: 1.15,
        skyLight: 0x3a4a80,
        skyPower: 0.4,
        reflections: 0.14,
        windowGlow: 2.6,
        glassOpacity: 0.92,
        gridOpacity: 0.7,
        stars: true,
    },
};

const SUNSET_WARMTH_K = 2300;
const OVERCAST_DAY = 0xb3bcc2;
const OVERCAST_NIGHT = 0x10181a;

// Golden hour: a low warm sun, a deep sky above an orange horizon and the first lit windows.
const SUNSET: ScenePalette = {
    ...SCENE_PALETTES.light,
    sky: 0x2c4a86,
    fog: 0xe6cdb9,
    ground: 0xcfc4b3,
    horizon: 0xffb27a,
    sunPower: 2.6,
    skyLight: 0xf2c9b0,
    skyPower: 0.5,
    reflections: 0.4,
    windowGlow: 1.3,
    glassOpacity: 0.7,
};

const BASES = { day: SCENE_PALETTES.light, sunset: SUNSET, night: SCENE_PALETTES.dark };

function mix(from: number, to: number, share: number): number {
    return new Color(from).lerp(new Color(to), share).getHex();
}

export interface SceneLighting {
    palette: ScenePalette;
    azimuth: number;
    elevation: number;
    exposure: number;
    shadows: boolean;
}

/**
 * Turns the settings of the lighting screen into what the engine takes. With the site's
 * coordinates the sun is the real one of the date and hour.
 */
export function sceneLighting(
    settings: LightingSettings,
    site: SolarSite | null = null,
): SceneLighting {
    const kind = skyOf(settings, site);
    const base = BASES[kind];
    const clouds = settings.clouds / 100;
    const overcast = kind === "night" ? OVERCAST_NIGHT : OVERCAST_DAY;
    const sunColour =
        kind === "night"
            ? base.sun
            : kelvinToHex(settings.temperature - (kind === "sunset" ? SUNSET_WARMTH_K : 0));

    const { elevation, azimuth } = sunPosition(settings, site);

    return {
        elevation,
        azimuth,
        exposure: settings.exposure,
        shadows: settings.shadows,
        palette: {
            ...base,
            sky: mix(base.sky, overcast, clouds),
            horizon: mix(base.horizon, overcast, clouds * 0.8),
            fog: mix(base.fog, overcast, clouds * 0.35),
            // Clouds take light from the sun and give it back from the whole sky.
            sun: mix(sunColour, 0xffffff, clouds * 0.6),
            sunPower: base.sunPower * settings.intensity * (1 - 0.75 * clouds),
            skyPower: base.skyPower * (1 + 0.9 * clouds),
            stars: base.stars && clouds < 0.5,
        },
    };
}
