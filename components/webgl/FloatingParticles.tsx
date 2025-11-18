import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const FloatingParticles = ({ count = 200, range = 50 }) => {
  const mesh = useRef<THREE.InstancedMesh>(null);

  // Gera posições aleatórias para poeira escura
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const time = Math.random() * 100;
      const factor = Math.random() * 100;
      const speed = Math.random() * 0.01 + 0.005; // Velocidade lenta
      const x = (Math.random() - 0.5) * range * 3; // Espalha bem no eixo X (tempo)
      const y = (Math.random() - 0.5) * range;
      const z = (Math.random() - 0.5) * range * 0.5; // Menos profundidade

      temp.push({ time, factor, speed, x, y, z, mx: 0, my: 0 });
    }
    return temp;
  }, [count, range]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!mesh.current) return;

    particles.forEach((particle, i) => {
      let { time, factor, speed, x, y, z } = particle;
      
      // Movimento suave de onda
      const t = state.clock.getElapsedTime();
      const timeFactor = t * speed + time; 
      
      // Orbitam levemente
      const newX = x + Math.sin(timeFactor) * 2;
      const newY = y + Math.cos(timeFactor * 0.8) * 1.5;
      const newZ = z + Math.sin(timeFactor * 0.5) * 1;

      dummy.position.set(newX, newY, newZ);
      
      // Escala pulsa levemente
      const scale = (Math.sin(t * 2 + factor) + 2) * 0.2; // Partículas pequenas
      dummy.scale.set(scale, scale, scale);
      
      dummy.rotation.set(newX * 0.1, newY * 0.1, 0);
      dummy.updateMatrix();
      
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <dodecahedronGeometry args={[0.2, 0]} />
      <meshBasicMaterial color="#6366f1" transparent opacity={0.4} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  );
};

export default FloatingParticles;