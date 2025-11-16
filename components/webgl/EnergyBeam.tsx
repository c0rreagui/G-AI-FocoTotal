

// FIX: Replaced `* as THREE` with direct imports to resolve type errors.
import React, { useMemo, useRef } from 'react';
import { ShaderMaterial, Vector3, CatmullRomCurve3, AdditiveBlending } from 'three';
import { useFrame } from '@react-three/fiber';
import { Tube } from '@react-three/drei';
import { generateTendrilPoints } from './webglUtils';

// --- SHADER DAS FIBRAS ---
// Este shader faz as bordas do tubo desaparecerem (fade out)
const fiberVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const fiberFragmentShader = `
  varying vec2 vUv;
  void main() {
    // 'vUv.y' vai de 0.0 (borda) a 1.0 (centro) e de volta a 0.0 (outra borda)
    // Isso cria um "fade" nas bordas do tubo.
    float opacity = smoothstep(0.0, 0.5, vUv.y) * (1.0 - smoothstep(0.5, 1.0, vUv.y));
    
    // Multiplica por 4 para o centro ficar bem brilhante
    gl_FragColor = vec4(0.8, 0.9, 1.0, opacity * 4.0);
  }
`;
// --- FIM DO SHADER ---

// --- SHADER DO NÚCLEO (O MESMO DE ANTES) ---
// Este shader "pulsa" com o tempo
const coreVertexShader = `
  uniform float uTime;
  uniform float uAmplitude;
  uniform float uFrequency;
  
  // 2D Simplex noise
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
    vec3 pos = position;
    float noise = snoise(vec2(pos.x * uFrequency, uTime * 0.5));
    pos.y += noise * uAmplitude;
    pos.z += snoise(vec2(uTime * 0.4, pos.x * uFrequency)) * uAmplitude;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;
const coreFragmentShader = `
  uniform float uTime;
  void main() {
    float intensity = 0.6 + 0.4 * sin(uTime * 3.0);
    gl_FragColor = vec4(0.8, 0.9, 1.0, 1.0) * intensity;
  }
`;
// --- FIM DO SHADER ---


interface EnergyBeamProps {
    pointCount: number;
    spacing: number;
}

// Configurações do "Mar Agitado" v2.0
const FIBER_COUNT = 30;  // Mais fios
const FIBER_RADIUS = 0.02; // Fios finos
const FIBER_SPREAD = 0.6;  // Mais "caos" (espalhamento)
const CORE_RADIUS = 0.05;  // Núcleo mais grosso

const EnergyBeam: React.FC<EnergyBeamProps> = ({ pointCount, spacing }) => {
    // FIX: Use imported ShaderMaterial type.
    const coreMaterialRef = useRef<ShaderMaterial>(null);
    
    // 1. A Curva do "Núcleo" (uma só, no centro)
    const coreCurve = useMemo(() => {
        if (pointCount <= 1) return null;
        const startX = -((pointCount - 1) * spacing) / 2;
        const points = Array.from({ length: pointCount }, (_, i) => {
            const x = startX + i * spacing;
            // FIX: Use imported Vector3 class.
            return new Vector3(x, 0, 0); // Perfeitamente reta
        });
        // FIX: Use imported CatmullRomCurve3 class.
        return new CatmullRomCurve3(points);
    }, [pointCount, spacing]);

    // 2. As Curvas das "Fibras" (várias, caóticas)
    const fiberCurves = useMemo(() => {
        if (pointCount <= 1) return [];
        // CORREÇÃO: Usa a função utilitária `generateTendrilPoints` que é segura contra
        // problemas de minificação (Temporal Dead Zone), resolvendo o erro "Cannot access 'g' before initialization".
        return Array.from({ length: FIBER_COUNT }).map(() => {
            const points = generateTendrilPoints(pointCount, spacing, FIBER_SPREAD);
            // FIX: Use imported CatmullRomCurve3 class.
            return new CatmullRomCurve3(points);
        });
    }, [pointCount, spacing]);

    // Shaders (uniforms)
    const coreShaderUniforms = useMemo(() => ({
        uTime: { value: 0 },
        uAmplitude: { value: 0.2 }, // O núcleo se mexe pouco
        uFrequency: { value: 0.2 },
    }), []);

    const fiberShaderUniforms = useMemo(() => ({
        uTime: { value: 0 },
        uAmplitude: { value: 0.5 }, // As fibras se mexem MUITO
        uFrequency: { value: 0.2 },
    }), []);

    // Animação (passa o 'uTime' para os dois shaders)
    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        if (coreMaterialRef.current) {
            coreMaterialRef.current.uniforms.uTime.value = time;
        }
        // (O shader das fibras não usa uTime, mas o do 'noise' sim)
        fiberShaderUniforms.uTime.value = time;
    });

    return (
        <group>
            {/* O "Núcleo" */}
            {coreCurve && (
                <Tube args={[coreCurve, 64, CORE_RADIUS, 8, false]}>
                    <shaderMaterial
                        ref={coreMaterialRef}
                        vertexShader={coreVertexShader}
                        fragmentShader={coreFragmentShader}
                        uniforms={coreShaderUniforms}
                        transparent={true}
                        opacity={0.8}
                    />
                </Tube>
            )}
            
            {/* As "Fibras" */}
            {fiberCurves.map((curve, index) => (
                <Tube key={index} args={[curve, 32, FIBER_RADIUS, 8, false]}>
                    {/* Shader de 'noise' (vertex) para mexer */}
                    <shaderMaterial
                        vertexShader={coreVertexShader} // Re-usa o shader de 'noise'
                        fragmentShader={fiberFragmentShader} // Mas usa o shader de 'fade'
                        uniforms={fiberShaderUniforms}
                        transparent={true}
                        // FIX: Use imported AdditiveBlending constant.
                        blending={AdditiveBlending} // Fica bonito
                        depthWrite={false} // Ajuda na transparência
                    />
                </Tube>
            ))}
        </group>
    );
};

export default EnergyBeam;