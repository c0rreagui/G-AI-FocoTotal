import React, { useMemo, useRef } from 'react';
import { CatmullRomCurve3, AdditiveBlending, Color, DoubleSide } from 'three';
import { useFrame } from '@react-three/fiber';
import { Tube } from '@react-three/drei';
import { generateTendrilPoints } from './webglUtils';

// Vertex Shader: Ondas Senoidais Lentas (Líquido)
const liquidVertexShader = `
  uniform float uTime;
  uniform float uThickness;
  varying vec2 vUv;
  varying float vWave;

  void main() {
    vUv = uv;
    vec3 pos = position;
    
    // Onda Larga (O corpo do rio se movendo)
    float bigWave = sin(pos.x * 0.1 + uTime * 0.3) * 1.5;
    
    // Onda de Superfície (Detalhes)
    float smallWave = cos(pos.x * 0.3 - uTime * 0.8) * 0.4;
    
    // Aplica movimento
    pos.y += bigWave + smallWave;
    pos.z += cos(pos.x * 0.15 - uTime * 0.2) * 0.8;

    // "Respiração" da espessura
    float breathe = 1.0 + sin(uTime * 1.5 + pos.x * 0.5) * 0.05;
    
    vec3 normalDir = normalize(normal);
    pos += normalDir * uThickness * breathe;

    vWave = bigWave; // Passa para o fragment shader para colorir baseado na altura
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

// Fragment Shader: Brilho de Neon + Núcleo
const liquidFragmentShader = `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uCoreSize;
  varying vec2 vUv;
  varying float vWave;

  void main() {
    // Gradiente Radial (Tubo)
    // 0.0 = centro do tubo, 0.5 = borda (uv.y vai de 0 a 1 ao redor do tubo)
    // Ajustamos para que 0.5 seja o "frente" visual
    float distFromCenter = abs(vUv.y - 0.5) * 2.0;
    
    // Núcleo Sólido (Branco)
    float core = smoothstep(uCoreSize + 0.1, uCoreSize, distFromCenter);
    
    // Glow Externo (Colorido)
    float glow = pow(1.0 - distFromCenter, 2.0);
    
    vec3 finalColor = mix(uColor * uIntensity, vec3(1.0), core); // Mistura cor com branco no núcleo
    
    // Transparência nas bordas
    float alpha = glow * 0.8 + core; 

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

    // Configurações Visuais Baseadas no Dispositivo
    const thickness = isMobile ? 0.6 : 1.0; // Grosso, mas não gigante no mobile
    
    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uColor: { value: new Color("#a855f7") }, // Roxo Neon Principal
        uThickness: { value: thickness }, 
        uIntensity: { value: 1.8 }, // Brilho forte
        uCoreSize: { value: 0.4 }   // Tamanho do núcleo branco
    }), [thickness]);

    return (
        <group position={[0, -1, 0]}> 
            {/* Único Tubo Otimizado com Shader Complexo */}
            <Tube args={[curve, 128, 1, 16, false]}>
                <shaderMaterial
                    ref={materialRef}
                    vertexShader={liquidVertexShader}
                    fragmentShader={liquidFragmentShader}
                    uniforms={uniforms}
                    transparent
                    blending={AdditiveBlending}
                    depthWrite={false} // Importante para evitar "recortes" feios
                    side={DoubleSide}
                />
            </Tube>
        </group>
    );
};

export default EnergyBeam;