import * as THREE from 'three';

// Lightweight rounded corner sprite material
export class RoundedSpriteMaterial extends THREE.SpriteMaterial {
  constructor(texture, cornerRadius = 0.08) {
    super({ 
      map: texture,
      toneMapped: false,
      sizeAttenuation: true,
    });
    
    this.userData.cornerRadius = cornerRadius;
    
    this.onBeforeCompile = (shader) => {
      // Inject minimal rounded corner code at the very end
      shader.fragmentShader = shader.fragmentShader.replace(
        '}',
        `
          // Lightweight rounded corners - only affects alpha
          vec2 uv = vMapUv - 0.5;
          vec2 d = abs(uv) - (0.5 - ${cornerRadius.toFixed(3)});
          float dist = length(max(d, 0.0)) - ${cornerRadius.toFixed(3)};
          float edge = smoothstep(0.001, -0.001, dist);
          gl_FragColor.a *= edge;
        }
        `
      );
    };
    
    this.transparent = true;
    this.needsUpdate = true;
  }
}
