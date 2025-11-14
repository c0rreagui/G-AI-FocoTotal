// CORREÇÃO: Mudar imports de '@/' para caminhos relativos
import React, { useState, useRef, useMemo } from 'react';
import { Task, Vector3 } from '../../types';
import { RoundedBox, Text } from '@react-three/drei';
import { CONTEXTS } from '../../constants';
// FIM DA CORREÇÃO
// FIX: Replaced `* as THREE` with direct imports to resolve type errors.
import { Group, Mesh, Color, MeshPhysicalMaterial, MathUtils } from 'three';
import { useFrame, ThreeEvent } from '@react-three/fiber';

// A chamada `extend` foi movida para TimelineScene.tsx para centralização.

interface TimelineCard3DProps {
    task: Task;
    position: Vector3;
    onClick: () => void; // Mantemos para o clique de edição
    onDragStart: (e: ThreeEvent<PointerEvent>, task: Task) => void; // NOVO (D'n'D)
}

const CARD_WIDTH = 4;
const CARD_HEIGHT = 2;

const TimelineCard3D: React.FC<TimelineCard3DProps> = (props) => {
    const { task, position, onClick, onDragStart } = props;
    
    const [isHovered, setIsHovered] = useState(false);
    // FIX: Use imported Group type.
    const groupRef = useRef<Group>(null);
    // FIX: Use imported Mesh type.
    const meshRef = useRef<Mesh>(null);
    
    const contextColor = task.context ? CONTEXTS[task.context]?.color : '#6366f1';
    // FIX: Use imported Color class.
    const emissiveColor = useMemo(() => new Color(contextColor), [contextColor]);

    // Animação de flutuação e brilho
    useFrame((state) => {
        if (groupRef.current) {
             const basePosition = position as [number,number,number];
             groupRef.current.position.y = basePosition[1] + Math.sin(state.clock.elapsedTime + basePosition[0]) * 0.1;
        }
        if (meshRef.current) {
            // FIX: Use imported MeshPhysicalMaterial type.
            const material = meshRef.current.material as MeshPhysicalMaterial;
            if (isHovered) {
                material.emissive.set(emissiveColor);
                // FIX: Use imported MathUtils object.
                material.emissiveIntensity = MathUtils.lerp(material.emissiveIntensity, 1.5, 0.1);
            } else {
                // FIX: Use imported MathUtils object.
                material.emissiveIntensity = MathUtils.lerp(material.emissiveIntensity, 0, 0.1);
            }
        }
    });

    const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setIsHovered(true);
        document.body.style.cursor = 'pointer';
    };

    const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
        setIsHovered(false);
        document.body.style.cursor = 'grab';
    };
    
    // Formata a data (DD/MM)
    const formattedDate = useMemo(() => {
        if (!task.dueDate) return '';
        // Trata como UTC para evitar off-by-one
        const date = new Date(task.dueDate.substring(0, 10) + 'T00:00:00');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        return `${day}/${month}`;
    }, [task.dueDate]);

    return (
        <group 
            ref={groupRef} 
            position={position}
            // O onClick aqui é o "fallback" (clicar no grupo)
            onClick={onClick} 
        >
            {/* Card 1: O "Vidro" (Detecta o início do D'n'D) */}
            <RoundedBox
                ref={meshRef}
                args={[CARD_WIDTH, CARD_HEIGHT, 0.2]}
                radius={0.1}
                smoothness={4}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
                // CORREÇÃO: Trocar onClick por onPointerDown
                onPointerDown={(e) => onDragStart(e, task)}
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
                    // FIX: Use imported Color class.
                    emissive={new Color(0x000000)}
                    emissiveIntensity={0}
                />
            </RoundedBox>
            
            {/* Card 2: O fundo "Fosco" (Também detecta D'n'D) */}
            <RoundedBox
                args={[CARD_WIDTH - 0.2, CARD_HEIGHT - 0.2, 0.1]}
                radius={0.05}
                smoothness={4}
                position={[0, 0, 0.1]}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
                // CORREÇÃO: Trocar onClick por onPointerDown
                onPointerDown={(e) => onDragStart(e, task)}
            >
                <meshBasicMaterial
                    color="black"
                    transparent
                    opacity={0.4}
                />
            </RoundedBox>

            {/* Textos (Também detectam D'n'D) */}
            <Text
                position={[- (CARD_WIDTH / 2) + 0.2, (CARD_HEIGHT / 2) - 0.2, 0.15]}
                fontSize={0.25}
                color="white"
                anchorX="left"
                anchorY="top"
                maxWidth={CARD_WIDTH - 0.4}
                lineHeight={1.2}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
                onPointerDown={(e) => onDragStart(e, task)}
            >
                {task.title}
            </Text>
            {task.context && (
                 <Text
                    position={[- (CARD_WIDTH / 2) + 0.2, - (CARD_HEIGHT / 2) + 0.3, 0.15]}
                    fontSize={0.15}
                    color={contextColor}
                    anchorX="left"
                    anchorY="bottom"
                    onPointerOver={handlePointerOver}
                    onPointerOut={handlePointerOut}
                    onPointerDown={(e) => onDragStart(e, task)}
                >
                    {CONTEXTS[task.context]?.label.toUpperCase()}
                </Text>
            )}
            {task.dueDate && (
                 <Text
                    position={[(CARD_WIDTH / 2) - 0.2, - (CARD_HEIGHT / 2) + 0.3, 0.15]}
                    fontSize={0.15}
                    color="white"
                    anchorX="right"
                    anchorY="bottom"
                    fillOpacity={0.7}
                    onPointerOver={handlePointerOver}
                    onPointerOut={handlePointerOut}
                    onPointerDown={(e) => onDragStart(e, task)}
                >
                    {formattedDate}
                </Text>
            )}
        </group>
    );
};

export default TimelineCard3D;