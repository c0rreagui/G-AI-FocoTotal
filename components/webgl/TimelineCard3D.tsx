import React, { useState, useRef, useMemo } from 'react';
import { Task, Vector3 } from '../../types';
import { RoundedBox, Text } from '@react-three/drei';
import { CONTEXTS } from '../../constants';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface TimelineCard3DProps {
    task: Task;
    position: Vector3;
    onClick: () => void;
}

const TimelineCard3D: React.FC<TimelineCard3DProps> = ({ task, position, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);
    const meshRef = useRef<THREE.Mesh>(null);
    const contextColor = task.context ? CONTEXTS[task.context]?.color : '#6366f1';
    
    // Criar uma cor THREE.Color para o emissive
    const emissiveColor = useMemo(() => new THREE.Color(contextColor), [contextColor]);

    useFrame((state) => {
        if (meshRef.current) {
             // 1. Animação de flutuação sutil (existente)
            meshRef.current.position.y = (position as [number,number,number])[1] + Math.sin(state.clock.elapsedTime + (position as [number,number,number])[0]) * 0.1;

            // 2. Lógica de pulso/emissão no hover
            const material = meshRef.current.material as THREE.MeshPhysicalMaterial;
            if (isHovered) {
                // Brilha com a cor do contexto
                material.emissive.set(emissiveColor);
                material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, 1.5, 0.1);
            } else {
                // Para de brilhar
                material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, 0, 0.1);
            }
        }
    });

    const handlePointerOver = (e: any) => {
        e.stopPropagation();
        setIsHovered(true);
        document.body.style.cursor = 'pointer';
    };

    const handlePointerOut = (e: any) => {
        setIsHovered(false);
        document.body.style.cursor = 'grab';
    };

    return (
        <group position={position}>
            <RoundedBox
                ref={meshRef}
                args={[4, 2, 0.2]} // width, height, depth
                radius={0.1}
                smoothness={4}
                onClick={onClick}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
            >
                <meshPhysicalMaterial
                    color={'#cccccc'} // Cor base do vidro
                    transmission={0.9}
                    thickness={0.5}
                    roughness={0.2}
                    clearcoat={1}
                    clearcoatRoughness={0.1}
                    transparent
                    opacity={0.8}
                    emissive={new THREE.Color(0x000000)} // Começa sem emissão
                    emissiveIntensity={0}
                />
            </RoundedBox>
            <Text
                position={[-1.7, 0.5, 0.15]}
                fontSize={0.25}
                color="white"
                anchorX="left"
                anchorY="top"
                maxWidth={3.4}
                lineHeight={1.2}
            >
                {task.title}
            </Text>
            {task.context && (
                 <Text
                    position={[-1.7, -0.7, 0.15]}
                    fontSize={0.15}
                    color={contextColor} // A cor do texto do contexto
                    anchorX="left"
                    anchorY="bottom"
                >
                    {CONTEXTS[task.context]?.label.toUpperCase()}
                </Text>
            )}
        </group>
    );
};

export default TimelineCard3D;