import React, { useMemo, useRef } from 'react';
import { CatmullRomCurve3, AdditiveBlending, Color, DoubleSide } from 'three';
import { useFrame } from '@react-three/fiber';
import { Tube } from '@react-three/drei';
import { generateTendrilPoints } from './webglUtils';

const plasmaVertexShader = `
  uniform float uTime;
  uniform float uThickness;
  varying vec2 vUv;
  varying float vNoise;
  varying vec3 vPos;

  // Simplex Noise
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
    vPos = pos;

    // Movimento Lento do Rio (Flow)
    float flow = uTime * 0.2;
    
    // Ondulação Macro (Forma do Rio)
    float waveY = sin(pos.x * 0.15 + flow) * 1.0;
    float waveZ = cos(pos.x * 0.1 - flow * 0.8) * 0.8;
    pos.y += waveY;
    pos.z += waveZ;

    // Ruído de Superfície (Turbulência)
    float noise = snoise(vec3(pos.x * 0.5 + flow * 2.0, pos.y * 0.5, uTime * 0.1));
    vNoise = noise;

    // Respiração da espessura
    vec3 normalDir = normalize(normal);
    float breathe = 1.0 + noise * 0.2;
    pos += normalDir * uThickness * breathe;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const plasmaFragmentShader = `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uTime;
  varying vec2 vUv;
  varying float vNoise;
  varying vec3 vPos;

  // FBM (Fractal Brownian Motion) para textura de fumaça rica
  // (Simplificado para performance no fragment shader)
  float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  void main() {
    // Coordenadas polares simuladas para o tubo
    float radialDist = abs(vUv.y - 0.5) * 2.0; // 0 no centro, 1 na borda
    
    // Núcleo de Energia (Quente/Branco)
    float core = smoothstep(0.3, 0.0, radialDist);
    
    // Camada de Plasma (Colorida e com Ruído)
    float noisePattern = vNoise * 0.5 + 0.5; // Normaliza 0..1
    
    // Efeito de fluxo longitudinal
    float flowStripe = sin(vUv.x * 20.0 - uTime * 3.0) * 0.1;
    
    // Cor base dinâmica
    vec3 baseColor = uColor;
    // Variação sutil de cor baseada na posição X (Rainbow sutil Loki)
    baseColor += vec3(sin(vPos.x * 0.1) * 0.1, cos(vPos.x * 0.1) * 0.1, 0.0);

    // Mistura final
    vec3 finalColor = baseColor * uIntensity;
    finalColor += vec3(1.0) * (core * 1.2); // Núcleo super brilhante
    finalColor += baseColor * noisePattern * 0.5; // Textura de ruído

    // Alpha (Transparência)
    // O núcleo é sólido, a borda é gasosa
    float alpha = core + (1.0 - radialDist) * noisePattern * 0.5;
    alpha = clamp(alpha, 0.0, 1.0);

    // Corta pixels muito transparentes para performance (opcional)
    if (alpha < 0.05) discard;

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

    const thickness = isMobile ? 0.7 : 1.4; // Mais grosso para impor presença
    
    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uColor: { value: new Color("#a855f7") }, // Roxo Loki Base
        uThickness: { value: thickness }, 
        uIntensity: { value: 2.0 } 
    }), [thickness]);

    return (
        <group position={[0, -0.5, 0]}> 
            <Tube args={[curve, 128, 1, 32, false]}>
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