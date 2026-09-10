import type { ProductTuning } from "./materials";

export type ProductId = "iphone" | "macbook-m5" | "airpods-max" | "macbook-neo" | "airpods-pro";

export type ProductConfig = {
  id: ProductId;
  model: string;
  /** Largest dimension after normalization, in scene units. */
  targetSize: number;
  /** Multiplier on the studio's output for this product. Gloss white needs a
   *  darker room than bead-blasted titanium: the rig is calibrated for metal,
   *  and a white shell under it clips to a featureless silhouette. */
  studioIntensity?: number;
  /** Seconds of the model's animation clip that `articulation` maps onto.
   *  The AirPods Pro clip is a loop that opens the case and shuts it again, so
   *  scrubbing the whole thing lands back on a closed case at full progress. */
  clipRange?: [number, number];
  /** Y rotation, in degrees, that turns the model to face the camera. Every
   *  Sketchfab export lands on a different axis, so this is measured per model
   *  rather than assumed. All choreography is expressed relative to it. */
  front: number;
  tuning: ProductTuning;
};

/** Applied to every product: Sketchfab exports ship envMapIntensity at 1.0,
 *  which makes metal under-reflect the studio and read as plastic. */
const BASE: ProductTuning["base"] = { envMapIntensity: 1.35 };

export const PRODUCTS: Record<ProductId, ProductConfig> = {
  iphone: {
    id: "iphone",
    model: "/models/iphone_17_pro_max.glb",
    targetSize: 2.95,
    front: 90,
    tuning: {
      base: BASE,
      byName: {
        // Grade 5 titanium: a brushed metal, not a mirror. Roughness under ~0.2
        // turns it into chrome and instantly looks like a render.
        // Polished titanium: near-mirror, so it separates from the matte back.
        "metalframe.002": { metalness: 1, roughness: 0.17, envMapIntensity: 2.5 },
        "metaL.001": { metalness: 1, roughness: 0.22, envMapIntensity: 2.1 },
        // Front glass: oleophobic coating means a hair of roughness, never 0.
        "glass.002": { metalness: 0, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 2.6 },
        "lensinglass": { metalness: 0.1, roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.01, envMapIntensity: 2.6 },
        // Matte-etched glass: a soft sheen, not a reflection.
        "backpanel.001": { metalness: 0, roughness: 0.38, clearcoat: 0.55, clearcoatRoughness: 0.28, envMapIntensity: 1.15 },
        "screen.001": { emissiveFromMap: true, emissiveIntensity: 0.85, roughness: 0.08, metalness: 0, envMapIntensity: 0.4 },
        "black.002": { metalness: 0, roughness: 0.42, envMapIntensity: 0.9 },
        "gray.001": { metalness: 0.9, roughness: 0.35 },
      },
    },
  },
  "macbook-m5": {
    id: "macbook-m5",
    model: "/models/macbook_pro_14-inch_m5.glb",
    targetSize: 2.9,
    front: 0,
    tuning: { base: BASE },
  },
  "airpods-max": {
    id: "airpods-max",
    model: "/models/airpods_max_sky_blue.glb",
    targetSize: 2.8,
    front: 40,
    tuning: { base: BASE },
  },
  "macbook-neo": {
    id: "macbook-neo",
    model: "/models/macbook_neo.glb",
    targetSize: 2.9,
    front: 0,
    tuning: {
      base: BASE,
      byName: {
        Anodized_aluminum: { metalness: 1, roughness: 0.28, envMapIntensity: 2.0 },
        Touchpad_glass: { metalness: 0, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.06 },
        Display_glass: { metalness: 0, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02 },
        Keycap: { metalness: 0, roughness: 0.55 },
        Camera_lens: { metalness: 0.2, roughness: 0.02, clearcoat: 1 },
        Steel: { metalness: 1, roughness: 0.22 },
      },
    },
  },
  "airpods-pro": {
    id: "airpods-pro",
    model: "/models/airpods_pro.glb",
    targetSize: 1.55,
    front: 90,
    studioIntensity: 0.62,
    // Only the opening half of the loop, and only as far as the earbuds
    // clearing the lid — the clip carries them right out of frame after that.
    clipRange: [0, 1.6],
    // Gloss white against a dark room clips almost immediately at the studio's
    // default intensity, and a blown-out case has no form at all.
    tuning: { base: { envMapIntensity: 0.55 } },
  },
};
