import React, { useMemo, useRef } from 'react';
import { ShaderMaterial, Vector3, AdditiveBlending, Color } from 'three';
import { useFrame } from '@react-three/fiber';
import { Tube } from '@react-three/drei';
import { generateBranchCurve } from './webglUtils';

const branchVertexShader = `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 pos = position;
    // Leve ondulação no fio
    float wave = sin(uv.x * 10.0 - uTime * 2.0) * 0.1;
    vec3 normalDir = normalize(normal);
    pos += normalDir * wave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const branchFragmentShader = `
  uniform vec3 uColor;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    // Pulso de energia rápido correndo para o card
    float flow = fract(vUv.x * 3.0 - uTime * 1.5);
    float pulse = smoothstep(0.0, 0.2, flow) * smoothstep(0.4, 0.2, flow);
    
    // Brilho branco no pulso
    vec3 finalColor = mix(uColor, vec3(1.0), pulse * 0.8);
    
    // Intensidade base
    finalColor *= 2.0;

    // Fade suave nas pontas para conectar sem costura
    float alpha = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

interface TimelineBranchProps {
    start: Vector3; 
    end: Vector3;   
    color: string;
}

const TimelineBranch: React.FC<TimelineBranchProps> = ({ start, end, color }) => {
    const materialRef = useRef<ShaderMaterial>(null);

    // Ajustamos a curva para garantir que ela sai de DENTRO do feixe principal
    // O feixe principal tem raio ~1.5, então começamos o ramo um pouco "atrás" visualmente
    // ou exatamente no centro, e o AdditiveBlending cuida da fusão.
    const curve = useMemo(() => {
        return generateBranchCurve(start, end);
    }, [start, end]);

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uColor: { value: new Color(color) }
    }), [color]);

    useFrame((state) => {
        if (materialRef.current) materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    });

    return (
        <Tube args={[curve, 32, 0.12, 8, false]}> {/* Espessura aumentada para 0.12 */}
            <shaderMaterial
                ref={materialRef}
                vertexShader={branchVertexShader}
                fragmentShader={branchFragmentShader}
                uniforms={uniforms}
                transparent
                blending={AdditiveBlending} // IMPORTANTE: Faz parecer luz
                depthWrite={false}
            />
        </Tube>
    );
};

export default TimelineBranch;