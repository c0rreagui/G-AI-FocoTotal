import React, { useMemo, useState, useRef } from 'react';
// CORREÇÃO: Caminhos relativos
import { Task, TimelineZoomLevel } from '../../types';
import { OrbitControls, Text, Plane } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import EnergyBeam from './EnergyBeam'; 
import TimelineCard3D from './TimelineCard3D'; 
import TimelineConnector from './TimelineConnector';
import { CONTEXTS } from '../../constants';
// FIM DA CORREÇÃO
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { format } from 'date-fns';

// A extensão foi movida para o App.tsx para evitar múltiplas instâncias

// --- COMPONENTE: Rótulo de Dia ---
interface DayMarkerProps {
    position: THREE.Vector3;
    label: string;
}
const DayMarker: React.FC<DayMarkerProps> = ({ position, label }) => {
    
    // --- CORREÇÃO DE CRASH (Pacote 18) ---
    // A variável 'y' deve ser declarada ANTES de ser usada.
    const y = -3; // Posição Y da linha 
    // --- FIM DA CORREÇÃO ---

    const textPosition = new THREE.Vector3(position.x, y - 0.5, position.z); // -3.5
    
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
    const { tasks, dateArray, zoom, onEditRequest, onUpdateTask } = props;
    
    const [draggingTask, setDraggingTask] = useState<Task | null>(null);
    const planeRef = useRef<THREE.Mesh>(null);
    const dragOffset = useRef(new THREE.Vector3()); 
    const groupRefs = useRef(new Map<string, THREE.Group>());

    // CORREÇÃO: Bug da "Visão por Hora" (do Pacote 15) e correção do ReferenceError
    const { dateMap } = useMemo(() => {
        const map = new Map<string, Task[]>();
        tasks.forEach(task => {
            if (task.dueDate) {
                let dateStr: string;
                if (zoom === 'hour') {
                    // USA a string inteira (ex: "2025-11-13 09:00")
                    dateStr = task.dueDate;
                } else {
                    // PEGA SÓ a data (ex: "2025-11-13")
                    dateStr = task.dueDate.substring(0, 10);
                }

                if (!map.has(dateStr)) {
                    map.set(dateStr, []);
                }
                map.get(dateStr)!.push(task);
            }
        });
        // FIX: Retorna o `map` para a propriedade `dateMap`, corrigindo o ReferenceError.
        return { dateMap: map };
    }, [tasks, zoom]);

    // Calcula os nós do "tronco"
    const beamNodes = useMemo(() => {
        if (!dateArray || dateArray.length === 0) return [];
        return dateArray.map((_date, dateIndex) => {
            const x = (dateIndex - (dateArray.length - 1) / 2) * CARD_SPACING_X;
            return new THREE.Vector3(x, 0, 0);
        });
    }, [dateArray]);

    // --- LÓGICA DE DRAG-AND-DROP (D'n'D) ---
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
            // Se soltar no mesmo lugar ou fora, reseta a posição visual
            onUpdateTask({ id: draggingTask.id }); 
        }
        setDraggingTask(null);
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
                onPointerMissed={(e) => {
                    if (draggingTask) {
                        handleDragEnd(e);
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
                        {/* * CORREÇÃO (Performance): O DayMarker agora é renderizado
                          * UMA VEZ por dia (aqui), e não N vezes (dentro do loop de tarefas).
                          */}
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
                                    {/* * CORREÇÃO (Estética): Usa o novo "Galho" (Script 3)
                                      * em vez de uma linha reta.
                                      */}
                                    <TimelineConnector
                                        start={beamNodePosition} // Começa no tronco (y=0)
                                        end={cardPosition}       // Termina na folha (y=2.5, 5.5, etc)
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