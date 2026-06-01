import { DangerZone } from "./types";

/**
 * Configurable list of airspace to avoid.
 *
 * Polygons are rough [lng, lat] outlines — APPROXIMATE and NOT for operational
 * flight planning. They exist to demonstrate route avoidance. Edit this list to
 * add/remove zones; the router treats every "avoid" zone as a no-fly area.
 *
 * To add a zone, append an object with a coarse outer ring (clockwise or
 * counter-clockwise both work; the ring is closed automatically).
 */
export const DANGER_ZONES: DangerZone[] = [
  {
    id: "iran-fir",
    name: "Iran airspace (Tehran FIR, approx.)",
    severity: "avoid",
    reason:
      "Heightened conflict risk / overflight advisories. Many carriers are routing around Iranian airspace.",
    // Coarse outline of Iran (NOT exact borders).
    polygon: [
      [44.0, 39.8],
      [48.0, 39.7],
      [48.6, 38.4],
      [50.1, 37.5],
      [53.9, 37.4],
      [56.4, 38.1],
      [59.6, 37.5],
      [61.0, 36.6],
      [61.2, 35.0],
      [60.9, 31.0],
      [61.8, 28.5],
      [62.8, 27.2],
      [61.5, 25.5],
      [57.0, 25.5],
      [54.0, 26.5],
      [51.5, 27.8],
      [49.0, 30.0],
      [47.7, 31.0],
      [47.4, 32.5],
      [45.5, 33.5],
      [46.0, 35.0],
      [44.8, 37.0],
    ],
  },

  // --- Example of how to add another zone (disabled by default) -------------
  // {
  //   id: "example-zone",
  //   name: "Example conflict zone",
  //   severity: "avoid",
  //   reason: "Describe why this airspace is avoided.",
  //   polygon: [ [lng, lat], [lng, lat], ... ],
  // },
];
