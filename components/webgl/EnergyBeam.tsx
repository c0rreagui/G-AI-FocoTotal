import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Tube } from '@react-three/drei';

const vertexShader = `
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

const fragmentShader = `
  uniform float uTime;
  varying vec3 vUv;
  void main() {
    float intensity = 0.5 + 0.5 * sin(uTime * 2.0 + vUv.x * 10.0);
    gl_FragColor = vec4(0.5, 0.6, 1.0, 1.0) * intensity;
  }
`;

interface EnergyBeamProps {
    pointCount: number;
    spacing: number;
}

const EnergyBeam: React.FC<EnergyBeamProps> = ({ pointCount, spacing }) => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const curve = useMemo(() => {
        if (pointCount <= 1) {
            return new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0));
        }
        const startX = -((pointCount - 1) * spacing) / 2;
        const points = Array.from({ length: pointCount }, (_, i) => new THREE.Vector3(startX + i * spacing, 0, 0));
        return new THREE.CatmullRomCurve3(points);
    }, [pointCount, spacing]);

    const shaderUniforms = useMemo(() => ({
        uTime: { value: 0 },
        uAmplitude: { value: 0.3 },
        uFrequency: { value: 0.2 },
    }), []);

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
        }
    });

    return (
        <Tube args={[curve, 64, 0.1, 8, false]}>
            <shaderMaterial
                ref={materialRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={shaderUniforms}
                wireframe={false}
            />
        </Tube>
    );
};

export default EnergyBeam;