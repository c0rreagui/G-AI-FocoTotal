import React, { useState, useRef, useMemo } from 'react';
import { Task, Vector3 } from '@/types';
import { RoundedBox, Text } from '@react-three/drei';
import { CONTEXTS } from '@/constants';
import * as THREE from 'three';
// FIX: Explicitly extend three.js primitives to fix JSX type errors.
import { useFrame, extend } from '@react-three/fiber';

// FIX: Register Three.js components with R3F to make them available as JSX elements.
extend({ Group: THREE.Group, MeshPhysicalMaterial: THREE.MeshPhysicalMaterial, MeshBasicMaterial: THREE.MeshBasicMaterial });

interface TimelineCard3DProps {
    task: Task;
    position: Vector3;
    onClick: () => void;
}

const CARD_WIDTH = 4;
const CARD_HEIGHT = 2;

const TimelineCard3D: React.FC<TimelineCard3DProps> = ({ task, position, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);
    // CORREÇÃO: O Ref agora é do GRUPO, não só do vidro.
    const groupRef = useRef<THREE.Group>(null);
    const meshRef = useRef<THREE.Mesh>(null); // Ref do vidro (só para o material)
    
    const contextColor = task.context ? CONTEXTS[task.context]?.color : '#6366f1';
    const emissiveColor = useMemo(() => new THREE.Color(contextColor), [contextColor]);

    useFrame((state) => {
        // CORREÇÃO: Anima o GRUPO INTEIRO
        if (groupRef.current) {
             // 1. Animação de flutuação sutil (agora no grupo)
             // O grupo já tem a `position` base, então só adicionamos o 'sin'
             groupRef.current.position.y = (position as [number,number,number])[1] + Math.sin(state.clock.elapsedTime + (position as [number,number,number])[0]) * 0.1;
        }

        // A lógica de brilho (emissive) continua a mesma
        if (meshRef.current) {
            const material = meshRef.current.material as THREE.MeshPhysicalMaterial;
            if (isHovered) {
                material.emissive.set(emissiveColor);
                material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, 1.5, 0.1);
            } else {
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

    // Formata a data para "DD/MM"
    const formattedDate = useMemo(() => {
        if (!task.dueDate) return '';
        const date = new Date(task.dueDate + 'T00:00:00');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        return `${day}/${month}`;
    }, [task.dueDate]);

    return (
        // CORREÇÃO: O grupo agora tem o Ref e a Posição base
        <group ref={groupRef} position={position}>
            {/* Card 1: O "Vidro" de fora (transparente) */}
            <RoundedBox
                ref={meshRef} // O ref do vidro é só para o material
                args={[CARD_WIDTH, CARD_HEIGHT, 0.2]} // width, height, depth
                radius={0.1}
                smoothness={4}
                onClick={onClick}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
                // Posição Y resetada para 0 (o grupo controla)
                position-y={0} 
            >
                <meshPhysicalMaterial
                    color={'#cccccc'}
                    transmission={0.8}
                    thickness={0.5}
                    roughness={0.3} 
                    clearcoat={1}
                    clearcoatRoughness={0.1}
                    transparent
                    opacity={0.7}
                    emissive={new THREE.Color(0x000000)}
                    emissiveIntensity={0}
                />
            </RoundedBox>
            
            {/* Card 2: O fundo "Fosco" (para legibilidade) */}
            <RoundedBox
                args={[CARD_WIDTH - 0.2, CARD_HEIGHT - 0.2, 0.1]} // Ligeiramente menor
                radius={0.05}
                smoothness={4}
                // Posição Y resetada para 0, Z ligeiramente na frente
                position={[0, 0, 0.1]} 
                onClick={onClick}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
            >
                <meshBasicMaterial
                    color="black"
                    transparent
                    opacity={0.4} // Fundo fosco
                />
            </RoundedBox>

            {/* Textos */}
            <Text
                // Posição Y relativa ao centro do card
                position={[- (CARD_WIDTH / 2) + 0.2, (CARD_HEIGHT / 2) - 0.2, 0.15]}
                fontSize={0.25}
                color="white"
                anchorX="left"
                anchorY="top"
                maxWidth={CARD_WIDTH - 0.4}
                lineHeight={1.2}
                onClick={onClick}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
            >
                {task.title}
            </Text>
            {task.context && (
                 <Text
                    // Posição Y relativa ao centro do card
                    position={[- (CARD_WIDTH / 2) + 0.2, - (CARD_HEIGHT / 2) + 0.3, 0.15]}
                    fontSize={0.15}
                    color={contextColor}
                    anchorX="left"
                    anchorY="bottom"
                    onClick={onClick}
                    onPointerOver={handlePointerOver}
                    onPointerOut={handlePointerOut}
                >
                    {CONTEXTS[task.context]?.label.toUpperCase()}
                </Text>
            )}
            {task.dueDate && (
                 <Text
                    // Posição Y relativa ao centro do card
                    position={[(CARD_WIDTH / 2) - 0.2, - (CARD_HEIGHT / 2) + 0.3, 0.15]}
                    fontSize={0.15}
                    color="white"
                    anchorX="right"
                    anchorY="bottom"
                    // FIX: The 'opacity' prop does not exist on the Drei Text component.
                    // Changed to 'fillOpacity' which correctly controls the text's transparency.
                    fillOpacity={0.7}
                    onClick={onClick}
                    onPointerOver={handlePointerOver}
                    onPointerOut={handlePointerOut}
                >
                    {formattedDate}
                </Text>
            )}
        </group>
    );
};

export default TimelineCard3D;