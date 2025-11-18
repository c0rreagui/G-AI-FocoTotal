import React, { useMemo, useRef } from 'react';
import { CatmullRomCurve3, AdditiveBlending, Color, DoubleSide } from 'three';
import { useFrame } from '@react-three/fiber';
import { Tube } from '@react-three/drei';
import { generateTendrilPoints } from './webglUtils';

// Vertex Shader: Ondas + Ruído de Superfície
const liquidVertexShader = `
  uniform float uTime;
  uniform float uThickness;
  varying vec2 vUv;
  varying float vDisplacement;

  // Simplex Noise
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vUv = uv;
    vec3 pos = position;
    
    // Movimento Macro (O Rio Serpenteando)
    float macroWaveY = sin(pos.x * 0.1 + uTime * 0.2) * 1.5;
    float macroWaveZ = cos(pos.x * 0.15 - uTime * 0.15) * 1.0;
    pos.y += macroWaveY;
    pos.z += macroWaveZ;

    // Movimento Micro (Turbulência na superfície)
    // Usamos a coordenada UV para criar ruído ao longo do tubo
    float noise = snoise(vec2(uv.x * 10.0 - uTime * 0.5, uv.y * 4.0));
    vDisplacement = noise; // Passa para o fragment shader

    // Aplica a turbulência na normal (incha/desincha localmente)
    vec3 normalDir = normalize(normal);
    pos += normalDir * (uThickness * (1.0 + noise * 0.2));
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

// Fragment Shader: Plasma
const liquidFragmentShader = `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec2 vUv;
  varying float vDisplacement;

  void main() {
    // Distância do centro
    float dist = abs(vUv.y - 0.5) * 2.0;
    
    // Núcleo (mais fino e intenso)
    float core = smoothstep(0.4, 0.0, dist);
    
    // Aura (mais larga e suave)
    float aura = smoothstep(1.0, 0.2, dist);
    
    // Adiciona variação de cor baseada no ruído do vertex
    // Áreas "altas" ficam mais brancas (espuma/energia pura)
    float noiseHighlight = smoothstep(0.2, 0.8, vDisplacement);
    
    vec3 finalColor = uColor * uIntensity;
    finalColor += vec3(1.0) * (core * 0.8 + noiseHighlight * 0.4); // Adiciona branco no núcleo e picos
    
    // Transparência
    float alpha = aura * 0.8 + core; 

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

interface EnergyBeamProps {
    pointCount: number;
    spacing: number;
    isMobile: boolean;
}

const EnergyBeam: React.FC<EnergyBeamProps> = ({ pointCount, spacing, isMobile }) => {
    const materialRef = useRef<any>(null);

    const curve = useMemo(() => {
        const points = generateTendrilPoints(pointCount, spacing); 
        return new CatmullRomCurve3(points);
    }, [pointCount, spacing]);

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
        }
    });

    const thickness = isMobile ? 0.6 : 1.1;
    
    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uColor: { value: new Color("#a855f7") }, // Roxo Vibrante
        uThickness: { value: thickness }, 
        uIntensity: { value: 1.6 }
    }), [thickness]);

    return (
        <group position={[0, -1, 0]}> 
            {/* Tubo com alta resolução para o ruído funcionar bem */}
            <Tube args={[curve, 128, 1, 32, false]}>
                <shaderMaterial
                    ref={materialRef}
                    vertexShader={liquidVertexShader}
                    fragmentShader={liquidFragmentShader}
                    uniforms={uniforms}
                    transparent
                    blending={AdditiveBlending}
                    depthWrite={false}
                    side={DoubleSide}
                />
            </Tube>
        </group>
    );
};

export default EnergyBeam;