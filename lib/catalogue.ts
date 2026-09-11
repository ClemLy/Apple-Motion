import type { ProductId } from "./products";
import type { Room } from "./theme";

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
  /** A saturated pull from the product itself, used only by the atmosphere
   *  layer behind it. The room colours are deliberately desaturated so type
   *  stays readable on them; this is the colour that lets a drifting glow
   *  actually read as belonging to this product rather than to the page. */
  accent: string;
  /** A deep tone of the same colour, for the one piece of solid display type
   *  on the ground. Navy for a sky-blue product rather than black: the graphic
   *  has to belong to the object's world, not sit on top of it as a label. */
  deep: string;
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
    accent: "#e08a4e",
    deep: "#5a3219",
    side: "left",
  },
  {
    id: "macbook-m5",
    anchor: "macbook",
    stack: ["Mac", "Book", "Pro"],
    bg: "#d8dbe0",
    ghost: "#eef0f3",
    accent: "#8a93a8",
    deep: "#262b35",
    side: "right",
  },
  {
    id: "airpods-max",
    anchor: "airpods-max",
    stack: ["Air", "Pods", "Max"],
    bg: "#c9dcee",
    ghost: "#e6f1fb",
    accent: "#6ba3d6",
    deep: "#14284a",
    side: "left",
  },
  {
    id: "macbook-neo",
    anchor: "neo",
    stack: ["Mac", "Book", "Neo"],
    bg: "#d9e0c8",
    ghost: "#eff3e2",
    accent: "#a3b86a",
    deep: "#3a4520",
    side: "right",
  },
  {
    id: "airpods-pro",
    anchor: "airpods-pro",
    stack: ["Air", "Pods", "Pro"],
    bg: "#cfc3b4",
    ghost: "#e7ded2",
    accent: "#b09a7e",
    deep: "#4a3b2c",
    side: "left",
  },
];

/**
 * The product the page opens on.
 *
 * The AirPods Max, not the iPhone: it is the best-resolved model in the set,
 * and it is the only one whose silhouette reads instantly at any angle, which
 * matters for an opening that throws it at the viewer before it has settled.
 */
export const HERO_PRODUCT: ProductId = "airpods-max";

export const ENTRY_BY_ID = Object.fromEntries(CATALOGUE.map((e) => [e.id, e])) as Record<
  ProductId,
  Entry
>;

/** A product's room, as the theme reads it. */
export function roomOf(entry: Entry): Room {
  return { bg: entry.bg, ghost: entry.ghost, accent: entry.accent };
}

/** The opening shares its room with the product it throws into frame. */
export const HERO_ROOM: Room = roomOf(ENTRY_BY_ID[HERO_PRODUCT]);

/**
 * The line-up, after the last product.
 *
 * A pale, neutral room: the five products are about to be seen side by side,
 * each carrying its own colour, so the wall behind them has to belong to none
 * of them.
 */
export const LINEUP_ROOM: Room = { bg: "#e9e7e3", ghost: "#f6f5f2", accent: "#8c8f96" };

/**
 * The manifesto, before the sign-off.
 *
 * The one dark room before the footer. After six light ones, the change of key
 * is what tells the visitor the tour is over and the page is now speaking for
 * itself.
 */
export const STORY_ROOM: Room = { bg: "#141417", ghost: "#1f1f24", accent: "#c9dcee", dark: true };
