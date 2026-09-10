import * as THREE from "three";

/** A partial override applied on top of whatever the GLB shipped with. */
export type MaterialTweak = {
  metalness?: number;
  roughness?: number;
  color?: string;
  emissive?: string;
  emissiveIntensity?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  envMapIntensity?: number;
  iridescence?: number;
  transmission?: number;
  ior?: number;
  thickness?: number;
  opacity?: number;
  transparent?: boolean;
  /** Drop the albedo map so `color` reads as the true surface colour. Needed
   *  when a model's base texture is strongly tinted: multiplying a lime map by
   *  a blue tint gives mud, not blue. */
  clearMap?: boolean;
  /** Reuse the albedo map as the emissive map, so a screen lights up showing
   *  its own content instead of glowing as a flat white slab. */
  emissiveFromMap?: boolean;
};

export type ProductTuning = {
  /** Applied to every material in the model before the named overrides. */
  base?: MaterialTweak;
  /** Keyed by exact glTF material name. */
  byName?: Record<string, MaterialTweak>;
};

function applyTweak(mat: THREE.MeshStandardMaterial, t: MaterialTweak) {
  const phys = mat as THREE.MeshPhysicalMaterial;
  if (t.metalness !== undefined) mat.metalness = t.metalness;
  if (t.roughness !== undefined) mat.roughness = t.roughness;
  if (t.color !== undefined) mat.color.set(t.color);
  if (t.clearMap) mat.map = null;
  if (t.emissiveFromMap && mat.map) {
    mat.emissiveMap = mat.map;
    mat.emissive.set("#ffffff");
  }
  if (t.emissive !== undefined) mat.emissive.set(t.emissive);
  if (t.emissiveIntensity !== undefined) mat.emissiveIntensity = t.emissiveIntensity;
  if (t.envMapIntensity !== undefined) mat.envMapIntensity = t.envMapIntensity;
  if (t.opacity !== undefined) mat.opacity = t.opacity;
  if (t.transparent !== undefined) mat.transparent = t.transparent;

  // Physical-only channels. Assigning these to a MeshStandardMaterial silently
  // does nothing, so callers must have upgraded the material first.
  if (t.clearcoat !== undefined) phys.clearcoat = t.clearcoat;
  if (t.clearcoatRoughness !== undefined) phys.clearcoatRoughness = t.clearcoatRoughness;
  if (t.iridescence !== undefined) phys.iridescence = t.iridescence;
  if (t.transmission !== undefined) phys.transmission = t.transmission;
  if (t.ior !== undefined) phys.ior = t.ior;
  if (t.thickness !== undefined) phys.thickness = t.thickness;

  mat.needsUpdate = true;
}

/** Upgrades a standard material to physical so clearcoat/transmission apply. */
function toPhysical(mat: THREE.MeshStandardMaterial): THREE.MeshPhysicalMaterial {
  if ((mat as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial) {
    return mat as THREE.MeshPhysicalMaterial;
  }
  const next = new THREE.MeshPhysicalMaterial({});
  THREE.Material.prototype.copy.call(next, mat);
  for (const key of [
    "color", "roughness", "metalness", "map", "lightMap", "lightMapIntensity",
    "aoMap", "aoMapIntensity", "emissive", "emissiveIntensity", "emissiveMap",
    "bumpMap", "bumpScale", "normalMap", "normalMapType", "normalScale",
    "displacementMap", "displacementScale", "displacementBias", "roughnessMap",
    "metalnessMap", "alphaMap", "envMapIntensity", "wireframe", "flatShading",
    // Carried over explicitly: a model whose glass already uses
    // KHR_materials_transmission would otherwise turn opaque the moment we
    // upgraded it to add clearcoat.
    "transmission", "ior", "thickness", "iridescence",
  ] as const) {
    const value = (mat as unknown as Record<string, unknown>)[key];
    if (value === undefined) continue;
    const target = next as unknown as Record<string, unknown>;
    if (value instanceof THREE.Color) (target[key] as THREE.Color).copy(value);
    else if (value instanceof THREE.Vector2) (target[key] as THREE.Vector2).copy(value);
    else target[key] = value;
  }
  next.name = mat.name;
  return next;
}

const SNAPSHOT_KEYS = [
  "metalness", "roughness", "emissiveIntensity", "envMapIntensity",
  "opacity", "transparent", "map", "emissiveMap",
  "clearcoat", "clearcoatRoughness", "iridescence", "transmission", "ior", "thickness",
] as const;

/**
 * Snapshots live in WeakMaps, deliberately not in `material.userData`.
 *
 * `THREE.Material.copy()` deep-clones userData through JSON, and this snapshot
 * holds Textures and Colors. Round-tripping a Texture through JSON produces an
 * inert plain object; assigning that back to `material.map` yields a material
 * that compiles to nothing and renders black. Keying off the object itself
 * sidesteps the whole problem, and lets the entries be collected with the model.
 */
const originalMaterial = new WeakMap<THREE.Mesh, THREE.Material | THREE.Material[]>();
const originalProps = new WeakMap<THREE.Material, Record<string, unknown>>();

const asList = (material: THREE.Material | THREE.Material[]) =>
  Array.isArray(material) ? material : [material];

/**
 * Records each mesh's shipped material and that material's shipped state.
 *
 * Finishes are overrides, and overrides have to be reversible: selecting Deep
 * Blue and then Cosmic Orange must return the phone to orange, not leave it
 * blue because the orange finish happens to define no overrides of its own.
 */
export function snapshotMaterials(root: THREE.Object3D) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || originalMaterial.has(mesh)) return;

    originalMaterial.set(mesh, mesh.material);

    for (const raw of asList(mesh.material)) {
      if (originalProps.has(raw)) continue;
      const mat = raw as THREE.MeshPhysicalMaterial;
      const saved: Record<string, unknown> = {
        color: mat.color?.clone(),
        emissive: mat.emissive?.clone(),
      };
      for (const key of SNAPSHOT_KEYS) saved[key] = mat[key];
      originalProps.set(raw, saved);
    }
  });
}

/**
 * Returns every mesh to the material it shipped with, in the state it shipped
 * in — disposing any material that `toPhysical` minted along the way, so
 * repeatedly switching finishes cannot accumulate orphaned programs on the GPU.
 */
export function restoreMaterials(root: THREE.Object3D) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;

    const original = originalMaterial.get(mesh);
    if (!original) return;

    const originals = new Set(asList(original));
    for (const current of asList(mesh.material)) {
      if (!originals.has(current)) current.dispose();
    }
    mesh.material = original;

    for (const raw of originals) {
      const saved = originalProps.get(raw);
      if (!saved) continue;
      const mat = raw as THREE.MeshPhysicalMaterial;
      if (saved.color) mat.color.copy(saved.color as THREE.Color);
      if (saved.emissive) mat.emissive.copy(saved.emissive as THREE.Color);
      for (const key of SNAPSHOT_KEYS) {
        (mat as unknown as Record<string, unknown>)[key] = saved[key];
      }
      mat.needsUpdate = true;
    }
  });
}

/**
 * Walks a loaded glTF scene and makes it render like a photograph.
 *
 * Beyond the per-material art direction, this fixes three things that Sketchfab
 * exports get wrong by default and that are individually enough to break the
 * illusion:
 *   1. envMapIntensity of 1.0 on everything, so metal under-reflects the studio.
 *   2. anisotropy of 1, which smears every texture the moment a surface tilts
 *      away from camera — very visible on the brushed aluminium and the mesh.
 *   3. flat shading tolerance on low-poly curves.
 */
export function tuneProduct(
  root: THREE.Object3D,
  tuning: ProductTuning,
  maxAnisotropy: number
) {
  const seen = new Set<THREE.Material>();

  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    const next = materials.map((raw) => {
      const std = raw as THREE.MeshStandardMaterial;
      const named = tuning.byName?.[std.name];
      const needsPhysical =
        named?.clearcoat !== undefined ||
        named?.transmission !== undefined ||
        named?.iridescence !== undefined ||
        tuning.base?.clearcoat !== undefined;

      const mat = needsPhysical ? toPhysical(std) : std;

      if (!seen.has(mat)) {
        seen.add(mat);

        for (const key of ["map", "normalMap", "roughnessMap", "metalnessMap", "emissiveMap", "aoMap"] as const) {
          const tex = mat[key] as THREE.Texture | null;
          if (!tex) continue;
          tex.anisotropy = maxAnisotropy;
          tex.needsUpdate = true;
        }

        if (tuning.base) applyTweak(mat, tuning.base);
        if (named) applyTweak(mat, named);
      }

      return mat;
    });

    mesh.material = Array.isArray(mesh.material) ? next : next[0];
  });
}

/**
 * Centers a model on the origin and scales it so its largest dimension equals
 * `targetSize`, so every product can share one camera rig and one set of
 * scroll-driven transforms regardless of the units its author modelled in.
 */
export function normalize(root: THREE.Object3D, targetSize: number) {
  // Idempotent by construction. `setScalar` overwrites rather than composes, so
  // a second call (React StrictMode double-invokes layout effects) would measure
  // the already-scaled model and reset it to raw authoring units. Resetting the
  // transform first makes repeat calls a no-op instead of a corruption.
  root.position.set(0, 0, 0);
  root.scale.setScalar(1);
  root.updateWorldMatrix(false, true);

  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = targetSize / Math.max(size.x, size.y, size.z);

  root.position.sub(center);
  root.scale.setScalar(scale);
  root.position.multiplyScalar(scale);

  return { size, center, scale };
}
