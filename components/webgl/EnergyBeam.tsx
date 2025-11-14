// CORREÇÃO: Mudar imports de '@/' para caminhos relativos
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, extend } from '@react-three/fiber';
import { Tube } from '@react-three/drei';
// FIM DA CORREÇÃO

extend({ Group: THREE.Group, ShaderMaterial: THREE.ShaderMaterial });

// --- SHADER DO NÚCLEO (Brilhante e Pulsante) ---
const coreVertexShader = `
  uniform float uTime;
  varying float vIntensity;
  void main() {
    vec3 pos = position;
    vIntensity = 0.7 + 0.3 * sin(pos.x * 0.5 + uTime * 2.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;
const coreFragmentShader = `
  varying float vIntensity;
  void main() {
    gl_FragColor = vec4(0.8, 0.9, 1.0, 1.0) * vIntensity;
  }
`;

// --- SHADER DOS TENDRILS (Caótico - "Mar Agitado") ---
const tendrilVertexShader = `
  uniform float uTime;
  uniform float uAmplitude;
  uniform float uFrequency;
  
  // 2D Simplex noise (mesmo de antes)
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
    float noise = snoise(vec2(pos.x * uFrequency, uTime * 0.8));
    pos.y += noise * uAmplitude;
    pos.z += snoise(vec2(uTime * 0.6, pos.x * uFrequency)) * uAmplitude;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;
const tendrilFragmentShader = `
  void main() {
    // Fios mais fracos, azulados
    gl_FragColor = vec4(0.6, 0.7, 1.0, 0.6);
  }
`;
// --- FIM DOS SHADERS ---

// --- HELPER FUNCTION ---
/**
 * Generates the points for a single chaotic "tendril" curve.
 * This is extracted to its own function to isolate its scope and prevent
 * variable name conflicts during code minification, which was causing a
 * "Cannot access 'y' before initialization" error.
 */
const generateTendrilPoints = (pointCount: number, spacing: number, spread: number): THREE.Vector3[] => {
    // Garante que haja pelo menos dois pontos para formar uma linha.
    if (pointCount <= 1) return [new THREE.Vector3(), new THREE.Vector3()];
    
    const startX = -((pointCount - 1) * spacing) / 2;
    const points = Array.from({ length: pointCount }, (_, i) => {
        const pX = startX + i * spacing;
        // Usando nomes de variáveis explícitos e únicos (pY, pZ) para máxima segurança.
        const pY = (Math.random() - 0.5) * spread;
        const pZ = (Math.random() - 0.5) * spread;
        return new THREE.Vector3(pX, pY, pZ);
    });
    return points;
};


interface EnergyBeamProps {
    pointCount: number;
    spacing: number;
}

// Configs do "Mar Agitado" (Tendrils)
const BEAM_COUNT = 20; // Mais fios
const BEAM_RADIUS = 0.01; // Super finos
const BEAM_SPREAD = 0.7; // Bem espalhados
const CORE_RADIUS = 0.08; // Núcleo 8x mais grosso

const EnergyBeam: React.FC<EnergyBeamProps> = ({ pointCount, spacing }) => {
    
    // Refs para os dois shaders
    const coreMaterialRef = useRef<THREE.ShaderMaterial>(null);
    const tendrilMaterialRef = useRef<THREE.ShaderMaterial>(null);
    
    // Curva do "Núcleo" (estável, no centro)
    const coreCurve = useMemo(() => {
        if (pointCount <= 1) return new THREE.LineCurve3(new THREE.Vector3(), new THREE.Vector3());
        const startX = -((pointCount - 1) * spacing) / 2;
        const points = Array.from({ length: pointCount }, (_, i) => {
            const x = startX + i * spacing;
            return new THREE.Vector3(x, 0, 0); // Sempre em Y=0, Z=0
        });
        return new THREE.CatmullRomCurve3(points);
    }, [pointCount, spacing]);

    // Curvas dos "Tendrils" (caóticos)
    const tendrilCurves = useMemo(() => {
        if (pointCount <= 1) return [];
        return Array.from({ length: BEAM_COUNT }).map(() => {
            // Chama a função auxiliar isolada para gerar os pontos.
            const points = generateTendrilPoints(pointCount, spacing, BEAM_SPREAD);
            return new THREE.CatmullRomCurve3(points);
        });
    }, [pointCount, spacing]);

    // Uniforms dos Shaders
    const coreUniforms = useMemo(() => ({
        uTime: { value: 0 },
    }), []);
    
    const tendrilUniforms = useMemo(() => ({
        uTime: { value: 0 },
        uAmplitude: { value: 0.5 }, // Amplitude alta
        uFrequency: { value: 0.4 }, // Frequência alta
    }), []);

    // Animação (atualiza os dois shaders)
    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        if (coreMaterialRef.current) {
            coreMaterialRef.current.uniforms.uTime.value = time;
        }
        if (tendrilMaterialRef.current) {
            tendrilMaterialRef.current.uniforms.uTime.value = time;
        }
    });

    return (
        <group>
            {/* 1. O NÚCLEO (Grosso e Pulsante) */}
            <Tube args={[coreCurve, 64, CORE_RADIUS, 8, false]}>
                <shaderMaterial
                    ref={coreMaterialRef}
                    vertexShader={coreVertexShader}
                    fragmentShader={coreFragmentShader}
                    uniforms={coreUniforms}
                    transparent
                    opacity={0.9}
                />
            </Tube>

            {/* 2. OS TENDRILS (Finos e Caóticos) */}
            {tendrilCurves.map((curve, index) => (
                <Tube key={index} args={[curve, 32, BEAM_RADIUS, 8, false]}>
                    <shaderMaterial
                        ref={index === 0 ? tendrilMaterialRef : undefined}
                        vertexShader={tendrilVertexShader}
                        fragmentShader={tendrilFragmentShader}
                        uniforms={tendrilUniforms}
                        transparent={true}
                        opacity={0.5}
                    />
                </Tube>
            ))}
        </group>
    );
};

export default EnergyBeam;