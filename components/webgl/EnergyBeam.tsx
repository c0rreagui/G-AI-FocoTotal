import React, { useMemo, useRef } from 'react';
import { CatmullRomCurve3, AdditiveBlending, Color, DoubleSide } from 'three';
import { useFrame } from '@react-three/fiber';
import { Tube } from '@react-three/drei';
import { generateTendrilPoints } from './webglUtils';

// --- SHADER DE PLASMA OMEGA ---
const plasmaVertexShader = `
  uniform float uTime;
  uniform float uThickness;
  varying vec2 vUv;
  varying float vDisplacement;
  varying float vFlow;

  // Simplex Noise 3D
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  float snoise(vec3 v){
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1. + 3.0 * C.xxx;
    i = mod(i, 289.0 );
    vec4 p = permute( permute( permute( i.z + vec4(0.0, i1.z, i2.z, 1.0 )) + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 1.0/7.0;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
    vUv = uv;
    vec3 pos = position;
    
    // Movimento do Rio (Flow)
    float flowSpeed = uTime * 0.3;
    float noise = snoise(vec3(pos.x * 0.2 + flowSpeed, pos.y * 0.5, uTime * 0.1));
    vDisplacement = noise;
    vFlow = pos.x; // Para degradê de cor longitudinal

    // Ondas Largas
    float waveY = sin(pos.x * 0.1 + uTime * 0.2) * 1.5;
    float waveZ = cos(pos.x * 0.15 - uTime * 0.15) * 1.0;
    
    pos.y += waveY;
    pos.z += waveZ;

    // Inchaço orgânico baseado no noise
    vec3 normalDir = normalize(normal);
    float breathe = 1.0 + noise * 0.3;
    pos += normalDir * uThickness * breathe;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const plasmaFragmentShader = `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec2 vUv;
  varying float vDisplacement;
  varying float vFlow;

  void main() {
    float dist = abs(vUv.y - 0.5) * 2.0;
    
    // Camadas de Energia
    float core = smoothstep(0.3, 0.0, dist); // Núcleo branco fino
    float innerGlow = smoothstep(0.6, 0.2, dist); // Brilho colorido médio
    float outerAura = smoothstep(1.0, 0.5, dist); // Aura externa fraca
    
    // Variação de cor longitudinal (gradiente sutil roxo -> azul)
    vec3 colorVar = mix(uColor, vec3(0.5, 0.5, 1.0), sin(vFlow * 0.1) * 0.2);

    // Highlights de turbulência (espuma de energia)
    float highlights = smoothstep(0.3, 0.8, vDisplacement);

    // Composição Final da Cor
    vec3 finalColor = colorVar * uIntensity;
    finalColor = mix(finalColor, vec3(1.0), core * 0.9 + highlights * 0.5);
    
    // Alpha Composto
    float alpha = core + innerGlow * 0.8 + outerAura * 0.4;
    alpha = clamp(alpha, 0.0, 1.0);

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

// Helper para taylorInvSqrt (necessário para snoise)
const shaderPrefix = `
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
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

    const thickness = isMobile ? 0.7 : 1.3; // Mais espesso para o visual "Rio"
    
    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uColor: { value: new Color("#a855f7") },
        uThickness: { value: thickness }, 
        uIntensity: { value: 2.0 } 
    }), [thickness]);

    return (
        <group position={[0, -1, 0]}> 
            <Tube args={[curve, 128, 1, 64, false]}>
                <shaderMaterial
                    ref={materialRef}
                    vertexShader={shaderPrefix + plasmaVertexShader}
                    fragmentShader={plasmaFragmentShader}
                    uniforms={uniforms}
                    transparent
                    blending={AdditiveBlending}
                    depthWrite={false}
                    side={DoubleSide}
                />
            </Tube>
        </group>
    );
};

export default EnergyBeam;