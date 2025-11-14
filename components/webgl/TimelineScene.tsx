

import React, { useMemo, useState, useRef } from 'react';
import { Task, TimelineZoomLevel } from '../../types';
import { OrbitControls, Text, Plane } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import EnergyBeam from './EnergyBeam';
import TimelineCard3D from './TimelineCard3D';
import TimelineConnector from './TimelineConnector'; 
import { CONTEXTS } from '../../constants';
// FIX: Replaced `* as THREE` with direct imports to resolve type errors.
// This ensures that classes like Vector3, Mesh, Group, etc., are found correctly.
import { Vector3, Plane as ThreePlane, Mesh, Group, MOUSE } from 'three';
import { useThree, ThreeEvent } from '@react-three/fiber';
import { format } from 'date-fns';

// --- COMPONENTE: Rótulo de Dia ---
interface DayMarkerProps {
    // FIX: Use imported Vector3 type.
    position: Vector3;
    label: string;
}
const DayMarker: React.FC<DayMarkerProps> = ({ position, label }) => {
    // CORREÇÃO (Layout): Movido para baixo (y = -3) e linha removida para evitar colisão
    const y = -3; 
    // FIX: Use imported Vector3 class.
    const textPosition = new Vector3(position.x, y - 0.5, position.z); // -3.5
    
    return (
        <group>
            <Text
                position={textPosition.toArray()}
                fontSize={0.3}
                color="#aaa"
                anchorX="center"
                anchorY="middle"
                rotation-x={-Math.PI / 12}
            >
                {label}
            </Text>
        </group>
    );
};
// --- FIM DO COMPONENTE ---


interface TimelineSceneProps {
    tasks: Task[];
    dateArray: string[];
    zoom: TimelineZoomLevel;
    onEditRequest: (task: Task, trigger: HTMLElement) => void;
    onUpdateTask: (task: Partial<Task> & { id: string }) => Promise<void>;
    onDateDoubleClick: (date: string) => void;
}

const CARD_SPACING_X = 6;
const CARD_SPACING_Y = 3;

const TimelineScene: React.FC<TimelineSceneProps> = (props) => {
    const { tasks, dateArray, zoom, onEditRequest, onUpdateTask, onDateDoubleClick } = props;
    
    const [draggingTask, setDraggingTask] = useState<Task | null>(null);
    // FIX: Use imported Mesh type for the ref.
    const planeRef = useRef<Mesh>(null);
    // FIX: Use imported Vector3 class.
    const dragOffset = useRef(new Vector3()); 
    // FIX: Use imported Group type for the ref map.
    const groupRefs = useRef(new Map<string, Group>());

    // CORREÇÃO: Bug da "Visão por Hora"
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
        return { dateMap };
    }, [tasks, zoom]);

    // Calcula os nós do "tronco" (os pontos no feixe)
    const beamNodes = useMemo(() => {
        if (!dateArray || dateArray.length === 0) return [];
        return dateArray.map((_date, dateIndex) => {
            const x = (dateIndex - (dateArray.length - 1) / 2) * CARD_SPACING_X;
            // FIX: Use imported Vector3 class.
            return new Vector3(x, 0, 0);
        });
    }, [dateArray]);

    // --- LÓGICA DE DRAG-AND-DROP (D'n'D) ---
    const handleDragStart = (e: ThreeEvent<PointerEvent>, task: Task) => {
        if (e.button !== 0) return; 
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setDraggingTask(task);
        
        // FIX: Use imported Vector3 and ThreePlane classes.
        const intersection = new Vector3();
        e.ray.intersectPlane(new ThreePlane(new Vector3(0, 0, 1), 0), intersection);
        
        const cardGroup = groupRefs.current.get(task.id);
        if (cardGroup) {
            dragOffset.current.subVectors(cardGroup.position, intersection);
        }
    };

    const handleDragMove = (e: ThreeEvent<PointerEvent>) => {
        if (!draggingTask || !planeRef.current) return;
        e.stopPropagation();
        // FIX: Switched from `e.point` to `e.intersections[0]?.point` for robustness
        // and to resolve a potential type definition issue. This is safer as it checks for intersections.
        const intersectionPoint = e.intersections[0]?.point;
        if (!intersectionPoint) return;

        const newPosition = intersectionPoint.clone().add(dragOffset.current);
        const cardGroup = groupRefs.current.get(draggingTask.id);
        if (cardGroup) {
            cardGroup.position.set(newPosition.x, newPosition.y, 0); 
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
            onUpdateTask({ id: draggingTask.id });
        }
        setDraggingTask(null);
    };

    const handleDoubleClick = (e: ThreeEvent<MouseEvent>) => {
        if (draggingTask) return;
        e.stopPropagation();
        // FIX: Switched from `e.point` to `e.intersections[0]?.point` for robustness
        // and to resolve the type error.
        const intersection = e.intersections[0];
        if (!intersection) return;
        const clickPositionX = intersection.point.x;
        
        let closestNodeIndex = -1;
        let minDistance = Infinity;

        beamNodes.forEach((node, index) => {
            const distance = Math.abs(clickPositionX - node.x);
            if (distance < minDistance) {
                minDistance = distance;
                closestNodeIndex = index;
            }
        });

        if (closestNodeIndex !== -1 && minDistance < CARD_SPACING_X / 2) {
            const dateStr = dateArray[closestNodeIndex];
            if (dateStr) {
                onDateDoubleClick(dateStr);
            }
        }
    };
    // --- FIM DA LÓGICA DE D'n'D ---

    return (
        <>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1.5} />
            
            <OrbitControls 
                enableZoom={true}
                enablePan={true}
                enableRotate={true}
                minDistance={5} 
                maxDistance={50}
                mouseButtons={{
                    // @ts-ignore
                    // FIX: Replaced `THREE.MOUSE` with direct `MOUSE` import.
                    MIDDLE: MOUSE.ROTATE,
                    RIGHT: MOUSE.PAN
                }}
            />
            
            <EnergyBeam 
                pointCount={Math.max(dateArray?.length || 0, 2)} 
                spacing={CARD_SPACING_X} 
            />

            <Plane
                ref={planeRef}
                args={[1000, 1000]}
                position={[0, 0, -0.5]}
                visible={false}
                onPointerMove={handleDragMove}
                onPointerUp={handleDragEnd}
                onDoubleClick={handleDoubleClick}
                onPointerMissed={() => {
                    if (draggingTask) {
                        onUpdateTask({ id: draggingTask.id });
                        setDraggingTask(null);
                    }
                }}
            />

            {/* Itera sobre o "Tronco" (dias/horas) */}
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
                        label = format(date, 'dd/MM EEE');
                    }
                } catch(e) { /* ignora */ }

                return (
                    <group key={dateStr}>
                        {/* * CORREÇÃO (Performance): O DayMarker agora é renderizado UMA VEZ por dia. */}
                        <DayMarker position={beamNodePosition} label={label} />
                        
                        {tasksForNode.map((task, taskIndex) => {
                            
                            const cardY = (taskIndex * CARD_SPACING_Y) + 2.5; 
                            // FIX: Use imported Vector3 class.
                            const cardPosition = new Vector3(
                                beamNodePosition.x,
                                cardY,
                                0
                            );
                            
                            const contextColor = task.context ? CONTEXTS[task.context]?.color : '#6366f1';

                            return (
                                <group 
                                    key={task.id}
                                    // @ts-ignore
                                    ref={(el: Group) => {
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
                                    {/* * CORREÇÃO (Estética): Usa o novo conector curvado. */}
                                    <TimelineConnector
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

            <EffectComposer>
                <Bloom luminanceThreshold={0.4} luminanceSmoothing={0.9} height={300} intensity={1.5} />
            </EffectComposer>
        </>
    );
};

export default TimelineScene;