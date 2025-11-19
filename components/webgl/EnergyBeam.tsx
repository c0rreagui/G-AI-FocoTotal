import React, { useMemo, useRef } from 'react';
import { CatmullRomCurve3, AdditiveBlending, Color, DoubleSide } from 'three';
import { useFrame } from '@react-three/fiber';
import { Tube } from '@react-three/drei';
import { generateTendrilPoints } from './webglUtils';

// VERTEX SHADER: Movimento Ondulatório + Espessura Variável
const fiberVertexShader = `
  uniform float uTime;
  uniform float uThickness;
  varying vec2 vUv;
  varying float vFlow;

  // Simplex Noise Helper
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  float snoise(vec2 v){
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
    float bigWave = sin(pos.x * 0.08 - uTime * 0.2) * 1.5;
    pos.y += bigWave;
    pos.z += cos(pos.x * 0.1 - uTime * 0.15) * 1.0;

    // Micro Turbulência
    float noise = snoise(vec2(pos.x * 0.5, uTime * 0.3));
    
    // Pulsação da Espessura (Respiração)
    vec3 normalDir = normalize(normal);
    float breathe = 1.0 + noise * 0.15;
    pos += normalDir * uThickness * breathe;
    
    vFlow = pos.x; // Passa para o fragment shader
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

// FRAGMENT SHADER: Textura de Fibras (Strands)
const fiberFragmentShader = `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uTime;
  varying vec2 vUv;
  varying float vFlow;

  void main() {
    // CRIAÇÃO DAS FIBRAS
    // vUv.y mapeia a circunferência do tubo.
    // Multiplicar por 60 cria 60 "linhas" de luz.
    float strands = sin(vUv.y * 60.0 + sin(vUv.x * 20.0) * 2.0); 
    strands = smoothstep(0.2, 0.9, strands); // Afia as linhas
    
    // FLUXO DE ENERGIA
    // Ondas de brilho correndo longitudinalmente
    float flowMap = sin(vUv.x * 10.0 - uTime * 2.5 + vUv.y * 10.0);
    flowMap = smoothstep(0.2, 0.8, flowMap);

    // COR BASE COM VARIAÇÃO
    vec3 color = uColor;
    color += vec3(sin(vFlow * 0.1) * 0.1, cos(vFlow * 0.1) * 0.1, 0.0);
    
    // BRILHO (HIGHLIGHTS)
    // As fibras brilham mais onde o fluxo passa
    vec3 highlight = vec3(1.0, 0.95, 1.0) * strands * flowMap;
    
    // COMPOSIÇÃO FINAL
    vec3 finalColor = (color * 0.5 + highlight) * uIntensity;
    
    // TRANSPARÊNCIA
    // Centro opaco, bordas transparentes, vales entre fibras transparentes
    float dist = abs(vUv.y - 0.5) * 2.0;
    float alpha = (strands * 0.7 + 0.3) * (1.0 - smoothstep(0.5, 1.0, dist));
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

const shaderPrefix = `vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }`;

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

    // Configuração Responsiva
    const thickness = isMobile ? 0.8 : 1.4; 
    const radialSegments = isMobile ? 24 : 64; 
    const tubularSegments = isMobile ? 64 : 128;

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uColor: { value: new Color("#a855f7") }, // Roxo Loki
        uThickness: { value: thickness }, 
        uIntensity: { value: 2.5 } // Brilho alto para AdditiveBlending
    }), [thickness]);

    return (
        <group position={[0, -1, 0]}> 
            <Tube args={[curve, tubularSegments, 1, radialSegments, false]}>
                <shaderMaterial
                    ref={materialRef}
                    vertexShader={shaderPrefix + fiberVertexShader}
                    fragmentShader={fiberFragmentShader}
                    uniforms={uniforms}
                    transparent
                    blending={AdditiveBlending} // O SEGREDO: Luz Soma Luz
                    depthWrite={false}
                    side={DoubleSide}
                />
            </Tube>
        </group>
    );
};

export default EnergyBeam;