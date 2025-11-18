import React, { useMemo, useRef } from 'react';
import { Vector3, CatmullRomCurve3, AdditiveBlending, Color } from 'three';
import { useFrame } from '@react-three/fiber';
import { Tube } from '@react-three/drei';
import { generateTendrilPoints } from './webglUtils';

const beamVertexShader = `
  uniform float uTime;
  uniform float uThickness;
  varying vec2 vUv;
  varying float vDisplacement;

  // Simplex Noise para o movimento orgânico
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
    
    // Ruído suave e lento para "respirar"
    float noise = snoise(vec2(pos.x * 0.1 - uTime * 0.2, uTime * 0.1));
    vDisplacement = noise;

    // Engrossa a linha baseado no ruído (efeito de cobra engolindo algo)
    vec3 normalDir = normalize(normal);
    pos += normalDir * noise * uThickness;

    // Onda senoidal larga para o movimento geral da linha
    pos.y += sin(pos.x * 0.2 + uTime * 0.5) * 0.5;
    pos.z += cos(pos.x * 0.15 + uTime * 0.4) * 0.5;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const beamFragmentShader = `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec2 vUv;
  varying float vDisplacement;

  void main() {
    // Centro brilhante, bordas suaves
    float intensity = 1.0 - abs(vUv.y - 0.5) * 2.0;
    intensity = pow(intensity, 2.0); // Deixa o centro mais focado
    
    // Variação de brilho ao longo do comprimento (pulso)
    float pulse = smoothstep(-1.0, 1.0, vDisplacement);
    
    vec3 finalColor = uColor * (intensity * uIntensity + pulse * 0.5);
    
    // Transparência nas bordas
    float alpha = intensity * 0.8 + 0.2;

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

interface EnergyBeamProps {
    pointCount: number;
    spacing: number;
}

const EnergyBeam: React.FC<EnergyBeamProps> = ({ pointCount, spacing }) => {
    const materialRefCore = useRef<any>(null);
    const materialRefGlow = useRef<any>(null);

    const curve = useMemo(() => {
        // Gera uma linha reta base, o shader fará o movimento
        const points = generateTendrilPoints(pointCount, spacing, 0); 
        return new CatmullRomCurve3(points);
    }, [pointCount, spacing]);

    useFrame((state) => {
        if (materialRefCore.current) {
            materialRefCore.current.uniforms.uTime.value = state.clock.getElapsedTime();
        }
        if (materialRefGlow.current) {
            materialRefGlow.current.uniforms.uTime.value = state.clock.getElapsedTime();
        }
    });

    const coreUniforms = useMemo(() => ({
        uTime: { value: 0 },
        uColor: { value: new Color("#ffffff") }, // Núcleo BRANCO QUENTE
        uThickness: { value: 0.5 }, // Menos distorção no núcleo
        uIntensity: { value: 2.0 }
    }), []);

    const glowUniforms = useMemo(() => ({
        uTime: { value: 0 },
        uColor: { value: new Color("#8b5cf6") }, // Roxo Loki
        uThickness: { value: 1.5 }, // Muita distorção no brilho externo
        uIntensity: { value: 1.0 }
    }), []);

    return (
        <group>
            {/* 1. O GLOW EXTERNO (Grosso e Colorido) */}
            <Tube args={[curve, 64, 1.2, 16, false]}>
                <shaderMaterial
                    ref={materialRefGlow}
                    vertexShader={beamVertexShader}
                    fragmentShader={beamFragmentShader}
                    uniforms={glowUniforms}
                    transparent
                    blending={AdditiveBlending}
                    depthWrite={false}
                    side={2} // Renderiza os dois lados (DoubleSide)
                />
            </Tube>

            {/* 2. O NÚCLEO (Fino e Branco) */}
            <Tube args={[curve, 64, 0.4, 8, false]}>
                 <shaderMaterial
                    ref={materialRefCore}
                    vertexShader={beamVertexShader}
                    fragmentShader={beamFragmentShader}
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