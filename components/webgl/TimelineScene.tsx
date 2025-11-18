import React, { useMemo, useState, useRef } from 'react';
import { Task, TimelineZoomLevel } from '../../types';
import { OrbitControls, Text, Plane } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing'; // Adicionado Noise
import EnergyBeam from './EnergyBeam'; 
import TimelineCard3D from './TimelineCard3D'; 
import TimelineBranch from './TimelineBranch'; 
import FloatingParticles from './FloatingParticles'; // NOVO
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
    const y = -3; // Rótulo mais abaixo para não competir com o brilho
    const textPosition = new THREE.Vector3(position.x, y, position.z);
    
    return (
        <group>
            <Text
                position={textPosition.toArray()}
                fontSize={0.5}
                color="#a5b4fc" 
                anchorX="center"
                anchorY="top"
                font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
            >
                {label}
            </Text>
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

const CARD_SPACING_X = 8; 
const CARD_BASE_HEIGHT = 2.5; // Cards mais próximos da linha (era 4)

const TimelineScene: React.FC<TimelineSceneProps> = (props) => {
    const { tasks, dateArray, zoom, onEditRequest, onUpdateTask } = props;
    
    const [draggingTask, setDraggingTask] = useState<Task | null>(null);
    const planeRef = useRef<THREE.Mesh>(null);
    const dragOffset = useRef(new THREE.Vector3()); 
    const groupRefs = useRef(new Map<string, THREE.Group>());

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
                if (!map.has(dateStr)) map.set(dateStr, []);
                map.get(dateStr)!.push(task);
            }
        });
        return { dateMap: map };
    }, [tasks, zoom]);

    const beamNodes = useMemo(() => {
        if (!dateArray || dateArray.length === 0) return [];
        return dateArray.map((_date, dateIndex) => {
            const x = (dateIndex - (dateArray.length - 1) / 2) * CARD_SPACING_X;
            return new THREE.Vector3(x, 0, 0);
        });
    }, [dateArray]);

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
            const clampedY = Math.max(intersection.y, 1.5); // Limite mais baixo
            cardGroup.position.set(intersection.x, clampedY, 0); 
        }
    };

    const handleDragEnd = (e: ThreeEvent<PointerEvent>) => {
        if (!draggingTask) return;
        e.stopPropagation();
        const cardGroup = groupRefs.current.get(draggingTask.id);
        if (!cardGroup) { setDraggingTask(null); return; }

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

    return (
        <>
            {/* Cores de Luz mais "Mágicas" */}
            <ambientLight intensity={0.1} />
            <pointLight position={[0, 0, 10]} intensity={2.0} color="#8b5cf6" distance={50} />
            <pointLight position={[10, 10, 5]} intensity={1.0} color="#ec4899" distance={50} />
            
            {/* Partículas para dar o ar de "Vazio Temporal" */}
            <FloatingParticles count={300} range={60} />

            <OrbitControls 
                enableZoom={true}
                enablePan={true}
                enableRotate={false} 
                minDistance={5} 
                maxDistance={50}
                mouseButtons={{
                    // @ts-ignore
                    LEFT: THREE.MOUSE.PAN, 
                    MIDDLE: THREE.MOUSE.DOLLY,
                    RIGHT: THREE.MOUSE.ROTATE
                }}
            />
            
            <EnergyBeam 
                pointCount={Math.max(dateArray?.length || 0, 2) * 3} 
                spacing={CARD_SPACING_X / 3} 
            />

            <Plane
                ref={planeRef}
                args={[1000, 1000]}
                position={[0, 0, 0.1]}
                visible={false}
                onPointerMove={handleDragMove}
                onPointerUp={handleDragEnd}
                onPointerMissed={(e) => { if (draggingTask) handleDragEnd(e); }}
            />

            {dateArray?.map((dateStr, dateIndex) => {
                const tasksForNode = dateMap.get(dateStr) || [];
                const beamNodePosition = beamNodes[dateIndex];
                if (!beamNodePosition) return null;

                let label = "";
                try {
                    if (zoom === 'hour') label = format(new Date(dateStr), 'HH:mm');
                    else label = format(new Date(dateStr + 'T00:00:00'), 'dd MMM');
                } catch(e) {}

                return (
                    <group key={dateStr}>
                        <DayMarker position={beamNodePosition} label={label} />
                        
                        {tasksForNode.map((task, taskIndex) => {
                            const isAlt = taskIndex % 2 !== 0;
                            const heightOffset = isAlt ? 2.5 : 0; // Mais variação vertical
                            
                            const cardY = CARD_BASE_HEIGHT + (taskIndex * 3.0) + heightOffset;
                            const randomX = (task.id.charCodeAt(0) % 3) - 1.5; 

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
                {/* Bloom agressivo para o efeito neon */}
                <Bloom luminanceThreshold={0.1} mipmapBlur intensity={1.5} radius={0.4} />
                <Noise opacity={0.05} /> {/* Um pouco de grão de filme */}
                <Vignette eskil={false} offset={0.1} darkness={0.6} />
            </EffectComposer>
        </>
    );
};

export default TimelineScene;