import React, { useMemo, useRef } from 'react';
import { CatmullRomCurve3, AdditiveBlending, Color, DoubleSide } from 'three';
import { useFrame } from '@react-three/fiber';
import { Tube } from '@react-three/drei';
import { generateTendrilPoints } from './webglUtils';

// --- SHADER DO NÚCLEO (Sólido/Brilhante) ---
const coreVertexShader = `
  uniform float uTime;
  uniform float uThickness;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 pos = position;
    
    // Movimento lento e majestoso
    float waveY = sin(pos.x * 0.1 + uTime * 0.4) * 1.5;
    float waveZ = cos(pos.x * 0.15 - uTime * 0.3) * 1.0;
    
    pos.y += waveY;
    pos.z += waveZ;

    // Respiração
    float breathe = 1.0 + sin(uTime * 1.2 + pos.x * 0.5) * 0.1;
    
    vec3 normalDir = normalize(normal);
    pos += normalDir * uThickness * breathe;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const coreFragmentShader = `
  uniform vec3 uColor;
  varying vec2 vUv;

  void main() {
    // Brilho central intenso
    float intensity = pow(1.0 - abs(vUv.y - 0.5) * 2.0, 3.0);
    vec3 col = mix(uColor, vec3(1.0), intensity * 0.8); // Centro branco
    gl_FragColor = vec4(col, intensity);
  }
`;

// --- SHADER DA AURA (Efeito de Gás/Energia) ---
const auraVertexShader = `
  uniform float uTime;
  uniform float uThickness;
  varying vec2 vUv;
  varying float vNoise;

  // Simplex Noise simples
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

    // Segue o mesmo movimento do núcleo
    float waveY = sin(pos.x * 0.1 + uTime * 0.4) * 1.5;
    float waveZ = cos(pos.x * 0.15 - uTime * 0.3) * 1.0;
    pos.y += waveY;
    pos.z += waveZ;

    // Adiciona ruído de "fumaça"
    float noise = snoise(vec2(pos.x * 0.5 - uTime, uTime * 0.5));
    vNoise = noise;

    // Expande a aura baseada no ruído
    vec3 normalDir = normalize(normal);
    pos += normalDir * (uThickness * 1.8 + noise * 0.5);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const auraFragmentShader = `
  uniform vec3 uColor;
  varying vec2 vUv;
  varying float vNoise;

  void main() {
    // Transparência nas bordas
    float edge = 1.0 - abs(vUv.y - 0.5) * 2.0;
    edge = smoothstep(0.0, 1.0, edge);
    
    // Textura de fumaça baseada no ruído do vertex
    float smoke = smoothstep(-1.0, 1.0, vNoise);
    
    // Cor final: Roxo profundo com transparência variável
    vec3 col = uColor;
    float alpha = edge * smoke * 0.4; // Bem transparente

    gl_FragColor = vec4(col, alpha);
  }
`;

interface EnergyBeamProps {
    pointCount: number;
    spacing: number;
    isMobile: boolean;
}

const EnergyBeam: React.FC<EnergyBeamProps> = ({ pointCount, spacing, isMobile }) => {
    const coreRef = useRef<any>(null);
    const auraRef = useRef<any>(null);

    const curve = useMemo(() => {
        const points = generateTendrilPoints(pointCount, spacing); 
        return new CatmullRomCurve3(points);
    }, [pointCount, spacing]);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        if (coreRef.current) coreRef.current.uniforms.uTime.value = t;
        if (auraRef.current) auraRef.current.uniforms.uTime.value = t;
    });

    const thickness = isMobile ? 0.5 : 0.8;
    
    const coreUniforms = useMemo(() => ({
        uTime: { value: 0 },
        uColor: { value: new Color("#d8b4fe") }, // Roxo claro
        uThickness: { value: thickness }
    }), [thickness]);

    const auraUniforms = useMemo(() => ({
        uTime: { value: 0 },
        uColor: { value: new Color("#7e22ce") }, // Roxo escuro/Loki
        uThickness: { value: thickness }
    }), [thickness]);

    return (
        <group position={[0, -1, 0]}> 
            {/* 1. AURA (Gás Externo) */}
            <Tube args={[curve, 64, 1, 16, false]}>
                <shaderMaterial
                    ref={auraRef}
                    vertexShader={auraVertexShader}
                    fragmentShader={auraFragmentShader}
                    uniforms={auraUniforms}
                    transparent
                    blending={AdditiveBlending}
                    depthWrite={false}
                    side={DoubleSide}
                />
            </Tube>

            {/* 2. NÚCLEO (Energia Pura) */}
            <Tube args={[curve, 64, 1, 8, false]}>
                <shaderMaterial
                    ref={coreRef}
                    vertexShader={coreVertexShader}
                    fragmentShader={coreFragmentShader}
                    uniforms={coreUniforms}
                    transparent
                    blending={AdditiveBlending}
                    depthWrite={false}
                />
            </Tube>
        </group>
    );
};

export default EnergyBeam;