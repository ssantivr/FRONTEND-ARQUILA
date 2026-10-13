/**
 * Colours of the generated drawings (site plan, floor plans, elevations and section).
 *
 * They are literal values and not CSS variables on purpose: a drawing is downloaded as an SVG and
 * printed, and it must look the same outside the application, on white paper and in both themes.
 * This is the only place outside `styles/tokens.css` where colours are written.
 */
export const SHEET_COLORS = {
    background: "#fbfaf7",
    grid: "#e7e4dd",
    floor: "#f3f0e9",
    facade: "#ece8e0",
    text: "#1c2430",
    muted: "#5b6675",
    wall: "#1c2430",
    boundary: "#1c2430",
    accent: "#1f4e79",
    buildableLine: "#1f4e79",
    buildable: "rgba(31, 78, 121, 0.2)",
    glass: "rgba(31, 78, 121, 0.2)",
    free: "rgba(47, 125, 79, 0.16)",
    ground: "#2f7d4f",
    access: "#8a5d00",
    beam: "#8a5d00",
    door: "#7a4f24",
    roof: "#8c4a3c",
    roofFill: "#dcbfb4",
} as const;
