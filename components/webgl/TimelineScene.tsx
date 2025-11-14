

// CORREÇÃO: Mudar imports de '@/' para caminhos relativos
import React, { useMemo, useState, useRef } from 'react';
import { Task, TimelineZoomLevel } from '../../types';
import { OrbitControls, Line, Text, Plane } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import EnergyBeam from './EnergyBeam'; // Caminho relativo
import TimelineCard3D from './TimelineCard3D'; // Caminho relativo
import { CONTEXTS } from '../../constants'; // Caminho relativo
// FIM DA CORREÇÃO
import * as THREE from 'three';
import { useThree, ThreeEvent } from '@react-three/fiber';
import { format } from 'date-fns';

// A chamada `extend` foi movida para App.tsx para garantir uma inicialização única.

// --- NOVO COMPONENTE: Rótulo de Dia ---
interface DayMarkerProps {
    position: THREE.Vector3;
    label: string;
}
/**
 * Renderiza o rótulo da data (ex: "13/11 QUI") e a
 * linha divisória vertical abaixo do feixe de energia.
 */
const DayMarker: React.FC<DayMarkerProps> = ({ position, label }) => {
    
    // A variável 'y' deve ser declarada ANTES de ser usada.
    const y = -2; // Posição Y da linha

    const textPosition = new THREE.Vector3(position.x, y - 0.5, position.z); // y - 0.5 = -2.5
    // FIX: Corrigido o cálculo de `lineStart` para usar `y` diretamente, alinhando a linha com o texto.
    const lineStart = new THREE.Vector3(position.x, y, position.z); // y = -2
    const lineEnd = new THREE.Vector3(position.x, y + 1.5, position.z);   // y + 1.5 = -0.5

    return (
        <group>
            <Text
                position={textPosition.toArray()}
                fontSize={0.3}
                color="#aaa"
                anchorX="center"
                anchorY="middle"
                rotation-x={-Math.PI / 12} // Leve inclinação
            >
                {label}
            </Text>
            <Line
                points={[lineStart, lineEnd]}
                color="#aaa"
                lineWidth={1}
                opacity={0.3}
            />
        </group>
    );
};
// --- FIM DO NOVO COMPONENTE ---


interface TimelineSceneProps {
    tasks: Task[];
    dateArray: string[];
    zoom: TimelineZoomLevel;
    onEditRequest: (task: Task, trigger: HTMLElement) => void;
    onUpdateTask: (task: Partial<Task> & { id: string }) => Promise<void>;
    onDateDoubleClick: (date: string) => void;
}

const CARD_SPACING_X = 6; // Mais espaço entre os dias
const CARD_SPACING_Y = 3;

const TaskConnector: React.FC<{ start: THREE.Vector3, end: THREE.Vector3, color: string }> = ({ start, end, color }) => {
    return <Line points={[start, end]} color={color} lineWidth={3} dashed={false} opacity={1.0} transparent />;
}

const TimelineScene: React.FC<TimelineSceneProps> = (props) => {
    const { tasks, dateArray, zoom, onEditRequest, onUpdateTask, onDateDoubleClick } = props;
    
    const [draggingTask, setDraggingTask] = useState<Task | null>(null);
    const planeRef = useRef<THREE.Mesh>(null);
    const { camera } = useThree();
    const dragOffset = useRef(new THREE.Vector3()); 

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
            cardGroup.position.set(intersection.x, intersection.y, 0); 
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
        const clickPositionX = e.point.x;
        
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

    const groupRefs = useRef(new Map<string, THREE.Group>());

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
                    MIDDLE: THREE.MOUSE.ROTATE,
                    RIGHT: THREE.MOUSE.PAN
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
                } catch(e) { /* ignora datas inválidas */ }

                return (
                    <group key={dateStr}>
                        <DayMarker position={beamNodePosition} label={label} />
                        
                        {tasksForNode.map((task, taskIndex) => {
                            
                            const cardY = (taskIndex * CARD_SPACING_Y) + 2.5; 
                            const cardPosition = new THREE.Vector3(
                                beamNodePosition.x,
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
                                    <TaskConnector
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