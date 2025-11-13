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
import { extend, useThree, ThreeEvent } from '@react-three/fiber';
import { format } from 'date-fns';

extend({ AmbientLight: THREE.AmbientLight, PointLight: THREE.PointLight, Group: THREE.Group });

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
    const textPosition = new THREE.Vector3(position.x, -2.5, position.z);
    const lineStart = new THREE.Vector3(position.x, -2, position.z);
    const lineEnd = new THREE.Vector3(position.x, -0.5, position.z);

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
    
    // --- NOVO (D'n'D): Estado de Dragging ---
    const [draggingTask, setDraggingTask] = useState<Task | null>(null);
    const planeRef = useRef<THREE.Mesh>(null);
    const { camera } = useThree();
    // Armazena o "offset" (onde o usuário clicou no card)
    const dragOffset = useRef(new THREE.Vector3()); 
    // --- FIM D'n'D ---

    // CORREÇÃO: Bug da "Visão por Hora"
    const { dateMap, tasksWithTime } = useMemo(() => {
        const map = new Map<string, Task[]>();
        // Tarefas com 'dueDate' de hora (ex: "2025-11-13 09:00")
        const timeTasks = new Set<string>(); 

        tasks.forEach(task => {
            if (task.dueDate) {
                let dateStr: string;
                // Se o zoom for 'hour', usamos a string inteira (ex: "2025-11-13 09:00")
                // Se não, pegamos só a data (ex: "2025-11-13")
                if (zoom === 'hour') {
                    dateStr = task.dueDate;
                    timeTasks.add(task.id);
                } else {
                    dateStr = task.dueDate.substring(0, 10);
                }

                if (!map.has(dateStr)) {
                    map.set(dateStr, []);
                }
                map.get(dateStr)!.push(task);
            }
        });
        return { dateMap: map, tasksWithTime };
    }, [tasks, zoom]);

    // Calcula os nós do "tronco" (os pontos no feixe)
    const beamNodes = useMemo(() => {
        if (!dateArray || dateArray.length === 0) return [];
        return dateArray.map((_date, dateIndex) => {
            const x = (dateIndex - (dateArray.length - 1) / 2) * CARD_SPACING_X;
            return new THREE.Vector3(x, 0, 0);
        });
    }, [dateArray]);

    // --- LÓGICA DE DRAG-AND-DROP (D'n'D) ---
    const handleDragStart = (e: ThreeEvent<PointerEvent>, task: Task) => {
        // Só arrasta com o botão esquerdo
        if (e.button !== 0) return; 
        
        e.stopPropagation(); // Impede o OrbitControls de pegar o clique
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        
        setDraggingTask(task);
        
        // Calcula o offset (onde o usuário clicou no card)
        const intersection = new THREE.Vector3();
        e.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), intersection);
        const cardPosition = new THREE.Vector3().fromArray(e.object.parent!.position.toArray());
        dragOffset.current.subVectors(cardPosition, intersection);
    };

    const handleDragMove = (e: ThreeEvent<PointerEvent>) => {
        if (!draggingTask || !planeRef.current) return;
        
        e.stopPropagation();
        
        const intersection = e.point;
        
        // Aplica o offset
        intersection.add(dragOffset.current);

        // Atualiza a posição do card que está sendo arrastado
        const cardGroup = groupRefs.current.get(draggingTask.id);
        if (cardGroup) {
            cardGroup.position.set(intersection.x, intersection.y, cardGroup.position.z);
        }
    };

    const handleDragEnd = (e: ThreeEvent<PointerEvent>) => {
        if (!draggingTask) return;
        e.stopPropagation();

        // 1. Encontra o "nó" (dia/hora) mais próximo de onde o card foi solto
        const dropPosition = groupRefs.current.get(draggingTask.id)!.position;
        let closestNodeIndex = 0;
        let minDistance = Infinity;

        beamNodes.forEach((node, index) => {
            const distance = dropPosition.distanceToSquared(node);
            if (distance < minDistance) {
                minDistance = distance;
                closestNodeIndex = index;
            }
        });

        // 2. Pega a nova data (do "tronco")
        const newDueDate = dateArray[closestNodeIndex];
        
        // 3. Atualiza a tarefa no Supabase
        if (newDueDate && newDueDate !== draggingTask.dueDate) {
            onUpdateTask({ id: draggingTask.id, dueDate: newDueDate });
        } else {
            // Se não mudou, força uma re-renderização (voltando o card)
            onUpdateTask({ id: draggingTask.id });
        }

        setDraggingTask(null);
    };
    // --- FIM DA LÓGICA DE D'n'D ---

    // Armazena refs dos grupos de cards (para o D'n'D)
    const groupRefs = useRef(new Map<string, THREE.Group>());

    return (
        <>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1.5} />
            
            {/* CORREÇÃO: Configuração de Interação (Mouse) */}
            <OrbitControls 
                enableZoom={true}
                enablePan={true}      // Botão Direito
                enableRotate={true}   // Botão do Meio (Scroll)
                minDistance={5} 
                maxDistance={50}
                // Mapeia os botões
                mouseButtons={{
                    // @ts-ignore
                    MIDDLE: THREE.MOUSE.ROTATE, // Scroll-click = Orbitar
                    RIGHT: THREE.MOUSE.PAN      // Botão Direito = Arrastar
                }}
            />
            
            {/* O "Tronco" (Feixe Loki) */}
            <EnergyBeam 
                pointCount={Math.max(dateArray?.length || 0, 2)} 
                spacing={CARD_SPACING_X} 
            />

            {/* O "Plano de D'n'D" (Invisível) */}
            <Plane
                ref={planeRef}
                args={[1000, 1000]}
                position={[0, 0, -0.5]} // Um pouco atrás dos cards
                visible={false}
                onPointerMove={handleDragMove}
                onPointerUp={handleDragEnd}
            />

            {/* Itera sobre o "Tronco" (dias/horas) */}
            {dateArray?.map((dateStr, dateIndex) => {
                
                const tasksForNode = dateMap.get(dateStr) || [];
                const beamNodePosition = beamNodes[dateIndex];
                if (!beamNodePosition) return null;

                // Formata o rótulo (ex: "13/11 QUI" ou "14:00")
                let label = "";
                try {
                    if (zoom === 'hour') {
                        label = format(new Date(dateStr), 'HH:mm');
                    } else {
                        // FIX: Adicionado 'T00:00:00' e 'timeZone' para evitar erros de fuso horário
                        // que faziam a data formatada mostrar o dia anterior em algumas máquinas.
                        const date = new Date(dateStr + 'T00:00:00');
                        label = format(date, 'dd/MM EEE', { timeZone: 'UTC' });
                    }
                } catch(e) { /* ignora datas inválidas */ }

                return (
                    <group key={dateStr}>
                        {/* NOVO: Plano invisível para capturar duplo clique */}
                        <Plane
                            args={[CARD_SPACING_X, 20]} // Largura do slot, altura grande
                            position={[beamNodePosition.x, 0, -0.2]}
                            visible={false}
                            onDoubleClick={() => onDateDoubleClick(dateStr)}
                        />

                        {/* NOVO: Renderiza o Rótulo/Divisor */}
                        <DayMarker position={beamNodePosition} label={label} />
                        
                        {/* Renderiza as "Folhas" (tarefas) */}
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
                                    {/* A "Folha" (Card) */}
                                    <TimelineCard3D
                                        task={task}
                                        position={cardPosition.toArray()}
                                        onClick={() => onEditRequest(task, document.body)}
                                        // Passa os handlers de D'n'D
                                        onDragStart={handleDragStart}
                                    />
                                    {/* O "Galho" (Conector) */}
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