import * as THREE from "three";

/**
 * Turns a laptop model into something that can open and shut.
 *
 * The lid is found rather than named: these are Sketchfab exports with hashed
 * node names, but a laptop separates cleanly on height — every base part sits
 * within a millimetre of the desk while every lid part reaches the full height
 * of the machine.
 *
 * The rotation is applied as a matrix rather than by re-parenting onto a pivot.
 * `Object3D.attach` bakes its result into position/rotation/scale, and these
 * node chains carry non-uniform scale under rotation — a combination no TRS
 * triple can express, which silently skews the geometry into a giant slab.
 */
export type Clamshell = { apply: (openness: number) => void } | null;

export function buildClamshell(model: THREE.Object3D): Clamshell {
  model.updateWorldMatrix(true, true);

  const toModel = model.matrixWorld.clone().invert();
  const whole = new THREE.Box3().setFromObject(model);
  const threshold = whole.min.y + (whole.max.y - whole.min.y) * 0.25;

  const box = new THREE.Box3();
  const found: THREE.Mesh[] = [];
  const lidBounds = new THREE.Box3().makeEmpty();

  model.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.parent) return;
    box.setFromObject(mesh);
    if (box.max.y <= threshold) return;
    found.push(mesh);
    lidBounds.union(box);
  });

  if (found.length === 0) return null;

  // Hinge line: the bottom rear edge of the lid, in model space.
  const centre = whole.getCenter(new THREE.Vector3());
  const hinge = new THREE.Vector3(centre.x, lidBounds.min.y, lidBounds.max.z).applyMatrix4(toModel);
  const top = new THREE.Vector3(centre.x, lidBounds.max.y, lidBounds.min.z).applyMatrix4(toModel);

  // The angle that shuts the lid is measured from the lid's own extent rather
  // than hard-coded, so the same code fits any clamshell.
  const reach = top.clone().sub(hinge).normalize();
  const closedAngle = Math.acos(THREE.MathUtils.clamp(reach.z, -1, 1));

  const parts = found.map((mesh) => {
    const toParent = toModel.clone().multiply(mesh.parent!.matrixWorld);
    return {
      mesh,
      rest: mesh.matrix.clone(),
      toParent,
      fromParent: toParent.clone().invert(),
    };
  });

  for (const { mesh } of parts) mesh.matrixAutoUpdate = false;

  const rotation = new THREE.Matrix4();
  const scratch = new THREE.Matrix4();

  return {
    apply(openness: number) {
      const angle = closedAngle * (1 - THREE.MathUtils.clamp(openness, 0, 1));

      rotation
        .makeTranslation(hinge.x, hinge.y, hinge.z)
        .multiply(scratch.makeRotationX(angle))
        .multiply(scratch.makeTranslation(-hinge.x, -hinge.y, -hinge.z));

      for (const part of parts) {
        part.mesh.matrix
          .copy(part.fromParent)
          .multiply(rotation)
          .multiply(part.toParent)
          .multiply(part.rest);
        part.mesh.matrixWorldNeedsUpdate = true;
      }
    },
  };
}
