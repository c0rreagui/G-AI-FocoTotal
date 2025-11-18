import React, { useMemo, useState, useRef } from 'react';
import { Task, TimelineZoomLevel } from '../../types';
import { OrbitControls, Text, Plane } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import EnergyBeam from './EnergyBeam'; 
import TimelineCard3D from './TimelineCard3D'; 
import TimelineBranch from './TimelineBranch'; // NOVO COMPONENTE
import { CONTEXTS } from '../../constants';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { format } from 'date-fns';

// --- COMPONENTE: Rótulo de Dia ---
interface DayMarkerProps {
    position: THREE.Vector3;
    label: string;
}
const DayMarker: React.FC<DayMarkerProps> = ({ position, label }) => {
    const y = -2; // Rótulo um pouco abaixo do feixe principal
    const textPosition = new THREE.Vector3(position.x, y, position.z);
    
    return (
        <group>
            <Text
                position={textPosition.toArray()}
                fontSize={0.4}
                color="#888" // Cinza metálico
                anchorX="center"
                anchorY="top"
                font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
            >
                {label}
            </Text>
            {/* Pequeno ponto brilhante no dia */}
            <mesh position={[position.x, 0, 0]}>
                <sphereGeometry args={[0.1, 8, 8]} />
                <meshBasicMaterial color="white" transparent opacity={0.5} />
            </mesh>
        </group>
    );
};

interface TimelineSceneProps {
    tasks: Task[];
    dateArray: string[];
    zoom: TimelineZoomLevel;
    onEditRequest: (task: Task, trigger: HTMLElement) => void;
    onUpdateTask: (task: Partial<Task> & { id: string }) => Promise<void>;
    onDateDoubleClick: (date: string) => void;
}

const CARD_SPACING_X = 8; // Aumentado para dar "respiro" horizontal
const CARD_BASE_HEIGHT = 4; // Altura inicial dos cards

const TimelineScene: React.FC<TimelineSceneProps> = (props) => {
    const { tasks, dateArray, zoom, onEditRequest, onUpdateTask } = props;
    
    const [draggingTask, setDraggingTask] = useState<Task | null>(null);
    const planeRef = useRef<THREE.Mesh>(null);
    const dragOffset = useRef(new THREE.Vector3()); 
    const groupRefs = useRef(new Map<string, THREE.Group>());

    // Organiza tarefas por data
    const { dateMap } = useMemo(() => {
        const map = new Map<string, Task[]>();
        tasks.forEach(task => {
            if (task.dueDate) {
                let dateStr: string;
                if (zoom === 'hour') {
                    dateStr = task.dueDate;
                } else {
                    dateStr = task.dueDate.substring(0, 10);
                }

                if (!map.has(dateStr)) {
                    map.set(dateStr, []);
                }
                map.get(dateStr)!.push(task);
            }
        });
        return { dateMap: map };
    }, [tasks, zoom]);

    // Calcula a posição X de cada nó de data na linha do tempo
    const beamNodes = useMemo(() => {
        if (!dateArray || dateArray.length === 0) return [];
        return dateArray.map((_date, dateIndex) => {
            const x = (dateIndex - (dateArray.length - 1) / 2) * CARD_SPACING_X;
            return new THREE.Vector3(x, 0, 0);
        });
    }, [dateArray]);

    // --- D'n'D Logic ---
    const handleDragStart = (e: ThreeEvent<PointerEvent>, task: Task) => {
        if (e.button !== 0) return; 
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setDraggingTask(task);
        
        const intersection = new THREE.Vector3();
        e.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), intersection);
        
        const cardGroup = groupRefs.current.get(task.id);
        if (cardGroup) {
            dragOffset.current.subVectors(cardGroup.position, intersection);
        }
    };

    const handleDragMove = (e: ThreeEvent<PointerEvent>) => {
        if (!draggingTask || !planeRef.current) return;
        e.stopPropagation();
        const intersection = e.point;
        intersection.add(dragOffset.current);
        const cardGroup = groupRefs.current.get(draggingTask.id);
        if (cardGroup) {
            // Limita o movimento Y para não atravessar o chão
            const clampedY = Math.max(intersection.y, 2);
            cardGroup.position.set(intersection.x, clampedY, 0); 
        }
    };

    const handleDragEnd = (e: ThreeEvent<PointerEvent>) => {
        if (!draggingTask) return;
        e.stopPropagation();

        const cardGroup = groupRefs.current.get(draggingTask.id);
        if (!cardGroup) {
            setDraggingTask(null);
            return;
        }

        // Encontra a data mais próxima horizontalmente
        const dropPosition = cardGroup.position;
        let closestNodeIndex = 0;
        let minDistance = Infinity;

        beamNodes.forEach((node, index) => {
            const distance = Math.abs(dropPosition.x - node.x); 
            if (distance < minDistance) {
                minDistance = distance;
                closestNodeIndex = index;
            }
        });

        const newDueDate = dateArray[closestNodeIndex];
        
        if (newDueDate && newDueDate !== draggingTask.dueDate) {
            onUpdateTask({ id: draggingTask.id, dueDate: newDueDate });
        } else {
            // Força re-render para voltar à posição original se não mudou data
            onUpdateTask({ id: draggingTask.id }); 
        }
        setDraggingTask(null);
    };

    return (
        <>
            {/* Iluminação mais dramática para destacar o "Glow" */}
            <ambientLight intensity={0.2} />
            <pointLight position={[0, 10, 10]} intensity={1.0} color="#a5b4fc" />
            <pointLight position={[-20, 5, -10]} intensity={0.5} color="#c084fc" />
            
            <OrbitControls 
                enableZoom={true}
                enablePan={true}
                enableRotate={false} // Trava a rotação para manter o estilo "Side Scroller" 2.5D
                minDistance={10} 
                maxDistance={60}
                mouseButtons={{
                    // @ts-ignore
                    LEFT: THREE.MOUSE.PAN, // Pan com botão esquerdo para navegar fácil
                    MIDDLE: THREE.MOUSE.DOLLY,
                    RIGHT: THREE.MOUSE.ROTATE
                }}
            />
            
            {/* O Rio de Energia Principal */}
            <EnergyBeam 
                pointCount={Math.max(dateArray?.length || 0, 2) * 3} // Mais resolução
                spacing={CARD_SPACING_X / 3} 
            />

            {/* Plano invisível para capturar o Drag */}
            <Plane
                ref={planeRef}
                args={[1000, 1000]}
                position={[0, 0, 0.1]} // Levemente a frente
                visible={false}
                onPointerMove={handleDragMove}
                onPointerUp={handleDragEnd}
                onPointerMissed={(e) => { if (draggingTask) handleDragEnd(e); }}
            />

            {/* Renderização dos Dias e Tarefas */}
            {dateArray?.map((dateStr, dateIndex) => {
                const tasksForNode = dateMap.get(dateStr) || [];
                const beamNodePosition = beamNodes[dateIndex];
                if (!beamNodePosition) return null;

                let label = "";
                try {
                    if (zoom === 'hour') {
                        label = format(new Date(dateStr), 'HH:mm');
                    } else {
                        const date = new Date(dateStr + 'T00:00:00'); 
                        label = format(date, 'dd MMM');
                    }
                } catch(e) { /* ignora */ }

                return (
                    <group key={dateStr}>
                        <DayMarker position={beamNodePosition} label={label} />
                        
                        {tasksForNode.map((task, taskIndex) => {
                            // Alterna altura para evitar sobreposição visual
                            const isAlt = taskIndex % 2 !== 0;
                            const heightOffset = isAlt ? 2 : 0;
                            
                            const cardY = CARD_BASE_HEIGHT + (taskIndex * 3.5) + heightOffset;
                            
                            // Adiciona um leve "noise" na posição X para não ficar empilhado artificialmente
                            const randomX = (task.id.charCodeAt(0) % 3) - 1; 

                            const cardPosition = new THREE.Vector3(
                                beamNodePosition.x + randomX,
                                cardY,
                                0
                            );
                            
                            const contextColor = task.context ? CONTEXTS[task.context]?.color : '#6366f1';

                            return (
                                <group 
                                    key={task.id}
                                    // @ts-ignore
                                    ref={(el: THREE.Group) => {
                                        if (el) groupRefs.current.set(task.id, el);
                                        else groupRefs.current.delete(task.id);
                                    }}
                                >
                                    <TimelineCard3D
                                        task={task}
                                        position={cardPosition.toArray()}
                                        onClick={() => onEditRequest(task, document.body)}
                                        onDragStart={handleDragStart}
                                    />
                                    
                                    {/* O Novo Ramo Temporal Conectando ao Tronco */}
                                    <TimelineBranch
                                        start={beamNodePosition}
                                        end={cardPosition}
                                        color={contextColor}
                                    />
                                </group>
                            );
                        })}
                    </group>
                );
            })}

            <EffectComposer disableNormalPass>
                {/* Bloom Intenso para o efeito "Sci-Fi" */}
                <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.2} radius={0.6} />
                <Vignette eskil={false} offset={0.1} darkness={0.5} />
            </EffectComposer>
        </>
    );
};

export default TimelineScene;