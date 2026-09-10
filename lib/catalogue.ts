import type { ProductId } from "./products";

/**
 * What the site needs to know about a product at runtime.
 *
 * Deliberately small: the models, materials and lighting all live on the render
 * side now. Here a product is a name, a sequence of frames, and the colour of
 * the room it stands in.
 */
export type Entry = {
  id: ProductId;
  anchor: string;
  /** The name broken into display lines, set as a stacked block. */
  stack: string[];
  /** Section background. */
  bg: string;
  /** The oversized word behind the product. Lighter than the background —
   *  that inversion is what makes the reference layouts read as luminous
   *  rather than as grey text on grey. */
  ghost: string;
  /** Which side of the frame the product stands on. Alternated down the page:
   *  five sections with the product in the same place reads as a template, and
   *  the eye stops travelling after the second one. */
  side: "left" | "right";
};

export const CATALOGUE: Entry[] = [
  {
    id: "iphone",
    anchor: "iphone",
    stack: ["iPhone", "17 Pro", "Max"],
    bg: "#ead9c6",
    ghost: "#f8efe2",
    side: "left",
  },
  {
    id: "macbook-m5",
    anchor: "macbook",
    stack: ["Mac", "Book", "Pro"],
    bg: "#d8dbe0",
    ghost: "#eef0f3",
    side: "right",
  },
  {
    id: "airpods-max",
    anchor: "airpods-max",
    stack: ["Air", "Pods", "Max"],
    bg: "#c9dcee",
    ghost: "#e6f1fb",
    side: "left",
  },
  {
    id: "macbook-neo",
    anchor: "neo",
    stack: ["Mac", "Book", "Neo"],
    bg: "#d9e0c8",
    ghost: "#eff3e2",
    side: "right",
  },
  {
    id: "airpods-pro",
    anchor: "airpods-pro",
    stack: ["Air", "Pods", "Pro"],
    bg: "#cfc3b4",
    ghost: "#e7ded2",
    side: "left",
  },
];

export const HERO_PRODUCT: ProductId = "iphone";
export const HERO_BG = "#ead9c6";
export const HERO_GHOST = "#f8efe2";

export const ENTRY_BY_ID = Object.fromEntries(CATALOGUE.map((e) => [e.id, e])) as Record<
  ProductId,
  Entry
>;
