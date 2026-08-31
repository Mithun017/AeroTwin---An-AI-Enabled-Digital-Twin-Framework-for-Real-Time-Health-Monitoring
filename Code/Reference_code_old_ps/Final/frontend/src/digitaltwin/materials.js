import * as THREE from 'three';

// The source model already encodes the correct color intent via its 3 materials:
//   color_ffcd00 → CAT industrial yellow (painted body, housings, covers)
//   color_adb5bd → blue-gray machined metal (flywheel, turbo, cylinder head)
//   color_cccccc → neutral gray cast metal (other unpainted steel/iron parts)
//
// Those colors match the FreeCAD reference exactly — we keep them as-is and
// only upgrade metalness + roughness, turning the flat placeholder values
// (metalness=0, roughness=1 from Blender) into proper PBR industrial finishes.

const PBR = {
  color_ffcd00: { metalness: 0.05, roughness: 0.28 }, // glossy industrial paint
  color_adb5bd: { metalness: 0.75, roughness: 0.30 }, // polished machined aluminum
  color_cccccc: { metalness: 0.60, roughness: 0.42 }, // satin cast iron / steel
};

export function applyIndustrialMaterials(root) {
  const seen = new Set();
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (seen.has(mat)) continue;
      seen.add(mat);
      const pbr = PBR[mat.name];
      if (!pbr) continue;
      mat.metalness = pbr.metalness;
      mat.roughness = pbr.roughness;
      if (mat.name === 'color_ffcd00') mat.color.setHex(0xffcd11);
      mat.side = THREE.FrontSide;   // back-faces not rendered → hollow interiors appear dark
      mat.needsUpdate = true;
    }
  });
}
