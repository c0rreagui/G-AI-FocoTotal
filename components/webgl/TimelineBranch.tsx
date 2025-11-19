
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
    // Ondulação sincronizada com o rio principal
    float wave = sin(uv.x * 10.0 - uTime * 2.0) * 0.05;
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
    // Pulso de energia rápido
    float pulse = fract(vUv.x * 2.0 - uTime * 1.5);
    pulse = smoothstep(0.9, 1.0, pulse); 
    
    // Cor Brilhante (Branco + Cor do Contexto)
    vec3 finalColor = uColor + vec3(1.0) * pulse;
    finalColor *= 3.0; // Intensidade

    // Fade nas pontas (Conexão Suave)
    float alpha = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
    
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
        // Aumentamos a espessura para 0.12 (era 0.05) para visibilidade
        <Tube args={[curve, 32, 0.12, 8, false]}> 
            <shaderMaterial
                ref={materialRef}
                vertexShader={branchVertexShader}
                fragmentShader={branchFragmentShader}
                uniforms={uniforms}
                transparent
                blending={AdditiveBlending} // Brilha no escuro
                depthWrite={false}
            />
        </Tube>
    );
};

export default TimelineBranch;
