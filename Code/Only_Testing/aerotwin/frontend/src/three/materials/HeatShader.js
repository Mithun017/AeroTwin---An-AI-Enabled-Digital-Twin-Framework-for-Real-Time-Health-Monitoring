// HeatShader.js — Custom ShaderMaterial for engine heat visualisation
import * as THREE from 'three'

export function createHeatMaterial(baseColor = '#0ea5e9') {
  return new THREE.ShaderMaterial({
    uniforms: {
      uHeat:      { value: 0.0 },   // 0=cool cyan/blue, 1=critical hot red
      uBaseColor: { value: new THREE.Color(baseColor) },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uHeat;
      uniform vec3  uBaseColor;
      varying vec2  vUv;
      varying vec3  vNormal;
      varying vec3  vWorldPosition;

      vec3 heatRamp(float t) {
        // Vibrant aerospace thermal ramp: Electric Cyan -> Emerald Green -> Gold Amber -> Crimson Red
        vec3 cyan   = vec3(0.02, 0.72, 0.96);  // #0369a1 / #0284c7
        vec3 green  = vec3(0.13, 0.77, 0.36);  // #22c55e
        vec3 amber  = vec3(0.96, 0.62, 0.04);  // #f59e0b
        vec3 hot    = vec3(0.93, 0.27, 0.18);  // #ef4444

        if (t < 0.33) return mix(cyan, green, t * 3.0);
        if (t < 0.66) return mix(green, amber, (t - 0.33) * 3.0);
        return mix(amber, hot, (t - 0.66) * 3.0);
      }

      void main() {
        vec3 heat   = heatRamp(uHeat);
        vec3 base   = mix(uBaseColor, heat, uHeat * 0.85);

        // Rich 3-point studio diffuse lighting
        vec3 lightDir1 = normalize(vec3(1.0, 2.0, 1.5));
        vec3 lightDir2 = normalize(vec3(-1.5, 1.0, -1.0));

        float diff1 = max(dot(vNormal, lightDir1), 0.0);
        float diff2 = max(dot(vNormal, lightDir2), 0.0) * 0.5;
        float ambient = 0.55; // Keep unlit sides crisp & visible

        vec3 color = base * (diff1 + diff2 + ambient);

        // Metallic specularity / rim highlight
        vec3 viewDir = normalize(-vWorldPosition);
        float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
        rim = pow(rim, 3.0) * 0.4;
        color += vec3(0.8, 0.9, 1.0) * rim;

        // Thermal emissive glow when heated
        color += heat * (uHeat * uHeat * 0.6);

        gl_FragColor = vec4(color, 1.0);
      }
    `,
  })
}
