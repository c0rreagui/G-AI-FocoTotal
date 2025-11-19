
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const FloatingParticles = ({ count = 300, range = 60 }) => {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const time = Math.random() * 100;
      const factor = Math.random() * 100;
      const speed = Math.random() * 0.01 + 0.002;
      const x = (Math.random() - 0.5) * range * 3; 
      const y = (Math.random() - 0.5) * range * 0.8;
      const z = (Math.random() - 0.5) * range * 0.8;
      // Tamanho variado: algumas grandes (poeira próxima), outras minúsculas (estrelas)
      const size = Math.random() * 0.3 + 0.1; 

      temp.push({ time, factor, speed, x, y, z, size });
    }
    return temp;
  }, [count, range]);

  useFrame((state) => {
    if (!mesh.current) return;

    particles.forEach((particle, i) => {
      let { time, factor, speed, x, y, z, size } = particle;
      
      const t = state.clock.getElapsedTime();
      const timeFactor = t * speed + time; 
      
      // Movimento orbital lento
      const newX = x + Math.cos(timeFactor) * 2;
      const newY = y + Math.sin(timeFactor * 0.5) * 2;
      const newZ = z + Math.sin(timeFactor * 0.3) * 2;

      dummy.position.set(newX, newY, newZ);
      
      // Pulsação de brilho (escala)
      const s = (Math.sin(t * 2 + factor) + 2) * size;
      dummy.scale.set(s, s, s);
      
      dummy.rotation.set(s * 5, s * 5, s * 5);
      dummy.updateMatrix();
      
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <dodecahedronGeometry args={[0.2, 0]} />
      {/* Cor: Roxo/Azul pálido para combinar com o tema */}
      <meshBasicMaterial color="#a5b4fc" transparent opacity={0.6} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  );
};

export default FloatingParticles;
