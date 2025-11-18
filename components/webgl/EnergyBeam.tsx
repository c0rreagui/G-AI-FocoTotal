import React, { useMemo, useRef } from 'react';
import { CatmullRomCurve3, AdditiveBlending, Color, DoubleSide } from 'three';
import { useFrame } from '@react-three/fiber';
import { Tube } from '@react-three/drei';
import { generateTendrilPoints } from './webglUtils';

// Vertex Shader: Movimento Ondulatório
const fiberVertexShader = `
  uniform float uTime;
  uniform float uThickness;
  varying vec2 vUv;
  varying float vElevation;

  // Simplex Noise para movimento orgânico
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
    
    // Onda Larga (Rio)
    float bigWave = sin(pos.x * 0.1 - uTime * 0.3) * 1.5;
    
    // Ruído de detalhe
    float noise = snoise(vec2(pos.x * 0.2, uTime * 0.1));
    
    pos.y += bigWave + noise * 0.5;
    pos.z += cos(pos.x * 0.15 - uTime * 0.2) * 1.0;

    // Respiração
    float breathe = 1.0 + sin(uTime * 0.5 + pos.x * 0.5) * 0.2;
    
    vec3 normalDir = normalize(normal);
    pos += normalDir * uThickness * breathe;
    
    vElevation = pos.y;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

// Fragment Shader: Textura de Fibras/Strands
const fiberFragmentShader = `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uTime;
  varying vec2 vUv;
  varying float vElevation;

  void main() {
    // Cria o efeito de "fios" (strands) usando seno nas coordenadas UV radiais
    // vUv.y vai de 0 a 1 ao redor do tubo. Multiplicar por 40 cria 40 "linhas".
    float strands = sin(vUv.y * 40.0 + uTime * 0.5);
    strands = smoothstep(0.0, 1.0, strands); // Afia as linhas
    
    // Fluxo longitudinal (energia correndo pelo fio)
    float flow = sin(vUv.x * 10.0 - uTime * 2.0 + vUv.y * 10.0);
    flow = smoothstep(0.2, 0.8, flow);

    // Cor base
    vec3 color = uColor;
    
    // As partes "altas" do strand brilham mais (branco)
    vec3 highlight = vec3(1.0, 0.9, 1.0) * strands * flow;
    
    // Intensidade final
    vec3 finalColor = (color * 0.5 + highlight) * uIntensity;
    
    // Transparência: O centro do tubo é mais opaco, bordas somem
    // E os "vales" entre os fios são transparentes
    float alpha = (strands * 0.8 + 0.2) * smoothstep(0.0, 0.2, abs(vUv.y - 0.5));
    
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

    const thickness = isMobile ? 0.8 : 1.5; 
    
    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uColor: { value: new Color("#a855f7") }, // Roxo Loki
        uThickness: { value: thickness }, 
        uIntensity: { value: 2.5 } // Muito brilhante para o Bloom pegar
    }), [thickness]);

    return (
        <group position={[0, -1, 0]}> 
            <Tube args={[curve, 128, 1, 64, false]}>
                <shaderMaterial
                    ref={materialRef}
                    vertexShader={shaderPrefix + fiberVertexShader}
                    fragmentShader={fiberFragmentShader}
                    uniforms={uniforms}
                    transparent
                    blending={AdditiveBlending} // O SEGREDO: Luz soma com luz
                    depthWrite={false}
                    side={DoubleSide}
                />
            </Tube>
        </group>
    );
};

export default EnergyBeam;