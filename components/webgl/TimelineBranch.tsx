import React, { useMemo, useRef } from 'react';
import { ShaderMaterial, Vector3, AdditiveBlending, Color } from 'three';
import { useFrame } from '@react-three/fiber';
import { Tube } from '@react-three/drei';
import { generateBranchCurve } from './webglUtils';

// Reutilizamos os shaders do EnergyBeam para consistência visual,
// mas ajustamos a intensidade.

const branchVertexShader = `
  uniform float uTime;
  uniform float uAmplitude;
  
  // Simplex Noise (mesmo do EnergyBeam)
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
    // Animação de fluxo ao longo do tubo
    float noise = snoise(vec2(uv.x * 4.0 - uTime, uTime * 0.2));
    
    // Engrossa o tubo aleatoriamente (efeito de energia pulsante)
    vec3 normalDir = normalize(normal);
    pos += normalDir * noise * uAmplitude;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const branchFragmentShader = `
  uniform vec3 uColor;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    // Fade nas pontas do tubo (uv.x 0->1 é o comprimento)
    // O ramo deve parecer sair do tronco (sólido) e chegar no card (sólido)
    // mas podemos dar um brilho extra no meio.
    
    float intensity = 1.0;
    
    // Adiciona um brilho que corre pelo fio
    float flow = sin(vUv.x * 10.0 - uTime * 3.0);
    intensity += flow * 0.5;
    
    // As bordas laterais (uv.y) devem ter fade para parecer redondo/brilhante
    float edgeFade = smoothstep(0.0, 0.4, vUv.y) * (1.0 - smoothstep(0.6, 1.0, vUv.y));
    
    gl_FragColor = vec4(uColor, edgeFade * intensity);
  }
`;

interface TimelineBranchProps {
    start: Vector3; // Ponto no tronco
    end: Vector3;   // Ponto no card
    color: string;
}

const TimelineBranch: React.FC<TimelineBranchProps> = ({ start, end, color }) => {
    const materialRef = useRef<ShaderMaterial>(null);

    // Gera a geometria do ramo (curva complexa)
    const curve = useMemo(() => {
        return generateBranchCurve(start, end);
    }, [start, end]);

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uAmplitude: { value: 0.08 },
        uColor: { value: new Color(color) }
    }), [color]);

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
        }
    });

    return (
        <group>
            {/* O Ramo Principal */}
            <Tube args={[curve, 20, 0.06, 8, false]}>
                <shaderMaterial
                    ref={materialRef}
                    vertexShader={branchVertexShader}
                    fragmentShader={branchFragmentShader}
                    uniforms={uniforms}
                    transparent
                    blending={AdditiveBlending}
                    depthWrite={false}
                />
            </Tube>
            
            {/* Um segundo ramo mais fino e caótico em volta (efeito raio) */}
            <Tube args={[curve, 20, 0.02, 4, false]} position={[0, 0.05, 0]}>
                 <shaderMaterial
                    vertexShader={branchVertexShader}
                    fragmentShader={branchFragmentShader}
                    uniforms={{
                        ...uniforms,
                        uAmplitude: { value: 0.15 } // Mais caos no fio fino
                    }}
                    transparent
                    blending={AdditiveBlending}
                    depthWrite={false}
                    opacity={0.5}
                />
            </Tube>
        </group>
    );
};

export default TimelineBranch;