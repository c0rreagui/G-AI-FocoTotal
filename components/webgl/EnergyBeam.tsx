import React, { useMemo, useRef } from 'react';
import { CatmullRomCurve3, AdditiveBlending, Color } from 'three';
import { useFrame } from '@react-three/fiber';
import { Tube } from '@react-three/drei';
import { generateTendrilPoints } from './webglUtils';

// Vertex Shader: Movimento lento e volumoso (Líquido)
const liquidVertexShader = `
  uniform float uTime;
  uniform float uThickness;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 pos = position;
    
    // Onda principal (Lenta e Larga)
    float bigWave = sin(pos.x * 0.15 - uTime * 0.5) * 1.0;
    
    // Onda secundária (Detalhe de superfície)
    float smallWave = cos(pos.x * 0.5 - uTime * 1.2) * 0.3;
    
    // Aplica o movimento
    pos.y += bigWave + smallWave;
    pos.z += cos(pos.x * 0.2 - uTime * 0.3) * 0.5;

    // "Respiração" da espessura (pulsação)
    float breathe = 1.0 + sin(uTime * 2.0 + pos.x) * 0.1;
    
    // Engrossa o tubo
    vec3 normalDir = normalize(normal);
    pos += normalDir * uThickness * breathe;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const liquidFragmentShader = `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    // Gradiente radial suave (tubo de neon gasoso)
    float intensity = 1.0 - abs(vUv.y - 0.5) * 2.0;
    intensity = pow(intensity, 1.5); // Suaviza a borda
    
    // Fluxo de energia passando horizontalmente
    float flow = sin(vUv.x * 5.0 - uTime * 2.0) * 0.5 + 0.5;
    
    vec3 glow = uColor * uIntensity * intensity;
    glow += uColor * flow * 0.3; // Adiciona o brilho do fluxo

    // Bordas transparentes
    float alpha = intensity; 

    gl_FragColor = vec4(glow, alpha);
  }
`;

interface EnergyBeamProps {
    pointCount: number;
    spacing: number;
    isMobile: boolean;
}

const EnergyBeam: React.FC<EnergyBeamProps> = ({ pointCount, spacing, isMobile }) => {
    const materialRefGlow = useRef<any>(null);
    const materialRefCore = useRef<any>(null);

    const curve = useMemo(() => {
        const points = generateTendrilPoints(pointCount, spacing); 
        return new CatmullRomCurve3(points);
    }, [pointCount, spacing]);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        if (materialRefGlow.current) materialRefGlow.current.uniforms.uTime.value = t;
        if (materialRefCore.current) materialRefCore.current.uniforms.uTime.value = t;
    });

    // Configurações Visuais
    const thickness = isMobile ? 0.8 : 1.2; // Um pouco mais fino no mobile para não poluir
    
    const glowUniforms = useMemo(() => ({
        uTime: { value: 0 },
        uColor: { value: new Color("#a855f7") }, // Roxo Principal
        uThickness: { value: thickness }, 
        uIntensity: { value: 1.5 }
    }), [thickness]);

    const coreUniforms = useMemo(() => ({
        uTime: { value: 0 },
        uColor: { value: new Color("#ffffff") }, // Branco
        uThickness: { value: thickness * 0.3 }, // Núcleo sólido menor
        uIntensity: { value: 3.0 }
    }), [thickness]);

    return (
        <group position={[0, -1, 0]}> {/* Abaixa um pouco o rio todo */}
            {/* Camada Externa (Glow) */}
            <Tube args={[curve, 64, 1, 16, false]}>
                <shaderMaterial
                    ref={materialRefGlow}
                    vertexShader={liquidVertexShader}
                    fragmentShader={liquidFragmentShader}
                    uniforms={glowUniforms}
                    transparent
                    blending={AdditiveBlending}
                    depthWrite={false}
                    side={2}
                />
            </Tube>
            
            {/* Camada Interna (Núcleo) */}
            <Tube args={[curve, 64, 1, 8, false]}>
                <shaderMaterial
                    ref={materialRefCore}
                    vertexShader={liquidVertexShader}
                    fragmentShader={liquidFragmentShader}
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