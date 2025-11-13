import React, { useMemo } from 'react';
import { Task } from '@/types';
import { OrbitControls, Line } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import EnergyBeam from './EnergyBeam';
import TimelineCard3D from './TimelineCard3D';
import { CONTEXTS } from '@/constants';
import * as THREE from 'three';
// FIX: Explicitly extend three.js primitives to fix JSX type errors.
import { extend } from '@react-three/fiber';

// FIX: Register Three.js components with R3F to make them available as JSX elements.
extend({ AmbientLight: THREE.AmbientLight, PointLight: THREE.PointLight, Group: THREE.Group });

interface TimelineSceneProps {
    tasks: Task[]; // As "folhas"
    dateArray: string[]; // O "tronco" (esqueleto de dias)
    onEditRequest: (task: Task, trigger: HTMLElement) => void;
}

const CARD_SPACING_X = 5; // Espaço entre os DIAS
const CARD_SPACING_Y = 3; // Espaço vertical entre TAREFAS (empilhadas)

/**
 * Um conector visual que liga o card (evento) ao feixe principal (linha do tempo).
 */
const TaskConnector: React.FC<{ start: THREE.Vector3, end: THREE.Vector3, color: string }> = ({ start, end, color }) => {
    return (
        <Line
            points={[start, end]}
            color={color}
            lineWidth={3}
            dashed={false}
            opacity={1.0}
            transparent
        />
    );
}

const TimelineScene: React.FC<TimelineSceneProps> = ({ tasks, dateArray, onEditRequest }) => {
    
    // CORREÇÃO: Mapeia as "folhas" (tasks) para os dias
    const dateMap = useMemo(() => {
        const map = new Map<string, Task[]>();
        tasks.forEach(task => {
            if (task.dueDate) {
                const dateStr = task.dueDate;
                if (!map.has(dateStr)) {
                    map.set(dateStr, []);
                }
                map.get(dateStr)!.push(task);
            }
        });
        return map;
    }, [tasks]);

    // CORREÇÃO: Calcula os nós do "tronco" baseado no dateArray recebido
    const beamNodes = useMemo(() => {
        // Se dateArray for undefined ou vazio, retorna um array vazio
        if (!dateArray || dateArray.length === 0) {
            return [];
        }
        return dateArray.map((_date, dateIndex) => {
            const x = (dateIndex - (dateArray.length - 1) / 2) * CARD_SPACING_X;
            return new THREE.Vector3(x, 0, 0); // O ponto âncora no feixe
        });
    }, [dateArray]);

    return (
        <>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1.5} />
            
            <OrbitControls 
                enableZoom={true} 
                enablePan={true} 
                minDistance={5} 
                maxDistance={50}
                maxPolarAngle={Math.PI / 1.8}
                minPolarAngle={Math.PI / 2.2}
            />
            
            {/* Renderiza o "tronco" (o feixe Loki) */}
            {/* Garantir que pointCount seja no mínimo 2 para o Tube funcionar */}
            <EnergyBeam 
                pointCount={Math.max(dateArray?.length || 0, 2)} 
                spacing={CARD_SPACING_X} 
            />

            {/* CORREÇÃO: Itera sobre o "tronco" (dateArray das props) */}
            {dateArray?.map((date, dateIndex) => {
                
                // Pega as "folhas" (tarefas) para este dia
                const tasksForDay = dateMap.get(date) || [];
                
                // Pega a posição do "nó" no tronco
                const beamNodePosition = beamNodes[dateIndex]; 

                if (!beamNodePosition) return null; // Segurança

                // Agora, para este nó, renderiza todas as suas folhas (tarefas)
                return tasksForDay.map((task, taskIndex) => {
                    
                    // Lógica de "Empilhar" (Pacote 4)
                    const cardY = (taskIndex * CARD_SPACING_Y) + 2.5; 
                    const cardPosition = new THREE.Vector3(
                        beamNodePosition.x, // Posição X do nó
                        cardY,              // Posição Y empilhada
                        0
                    );
                    
                    const contextColor = task.context ? CONTEXTS[task.context]?.color : '#6366f1';

                    return (
                        <group key={task.id}>
                            {/* A "Folha" */}
                            <TimelineCard3D
                                task={task}
                                position={cardPosition.toArray()}
                                onClick={() => onEditRequest(task, document.body)}
                            />
                            {/* O "Galho" */}
                            <TaskConnector
                                start={beamNodePosition} // Começa no tronco
                                end={cardPosition}       // Termina na folha
                                color={contextColor}
                            />
                        </group>
                    );
                });
            })}

            <EffectComposer>
                <Bloom luminanceThreshold={0.4} luminanceSmoothing={0.9} height={300} intensity={1.5} />
            </EffectComposer>
        </>
    );
};

export default TimelineScene;