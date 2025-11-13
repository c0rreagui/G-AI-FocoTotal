import React, { useMemo } from 'react';
import { Task } from '../../types';
import { OrbitControls, Line } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import EnergyBeam from './EnergyBeam';
import TimelineCard3D from './TimelineCard3D';
import { CONTEXTS } from '../../constants';
import * as THREE from 'three';

interface TimelineSceneProps {
    tasks: Task[];
    onEditRequest: (task: Task, trigger: HTMLElement) => void;
}

const CARD_SPACING_X = 5;
const CARD_SPACING_Y = 3;

/**
 * Um conector visual que liga o card (evento) ao feixe principal (linha do tempo).
 */
const TaskConnector: React.FC<{ start: THREE.Vector3, end: THREE.Vector3, color: string }> = ({ start, end, color }) => {
    return (
        <Line
            points={[start, end]}
            color={color}
            lineWidth={2}
            dashed={false}
            opacity={0.5}
            transparent
        />
    );
}

const TimelineScene: React.FC<TimelineSceneProps> = ({ tasks, onEditRequest }) => {
    
    const { dateMap, dateArray } = useMemo(() => {
        const map = new Map<string, Task[]>();
        tasks.forEach(task => {
            const dateStr = task.dueDate!;
            if (!map.has(dateStr)) {
                map.set(dateStr, []);
            }
            map.get(dateStr)!.push(task);
        });

        const sortedDates = Array.from(map.keys()).sort();
        return { dateMap: map, dateArray: sortedDates };
    }, [tasks]);

    // Pré-calcular as posições dos nós do feixe central
    const beamNodes = useMemo(() => {
        return dateArray.map((_date, dateIndex) => {
            const x = (dateIndex - (dateArray.length - 1) / 2) * CARD_SPACING_X;
            return new THREE.Vector3(x, 0, 0); // O ponto âncora no feixe é sempre em y=0, z=0
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
            
            {/* Renderiza o novo EnergyBeam "Loki-style" */}
            <EnergyBeam pointCount={dateArray.length} spacing={CARD_SPACING_X} />

            {/* Mapeia as datas e tarefas para renderizar os Cards E os Conectores */}
            {dateArray.map((date, dateIndex) => {
                const tasksForDay = dateMap.get(date) || [];
                const beamNodePosition = beamNodes[dateIndex]; // Posição âncora no feixe

                return tasksForDay.map((task, taskIndex) => {
                    // Calcula a posição do card (igual antes)
                    const cardPosition = new THREE.Vector3(
                        beamNodePosition.x,
                        (taskIndex % 2 === 0 ? 1 : -1) * (Math.floor(taskIndex / 2) * CARD_SPACING_Y + 1.5),
                        0
                    );
                    
                    // Define a cor do conector
                    const contextColor = task.context ? CONTEXTS[task.context]?.color : '#6366f1';

                    return (
                        <group key={task.id}>
                            {/* O Card de Vidro */}
                            <TimelineCard3D
                                task={task}
                                position={cardPosition.toArray()} // TimelineCard3D espera um array [x,y,z]
                                onClick={() => onEditRequest(task, document.body)}
                            />
                            {/* O Conector (NOVO) */}
                            <TaskConnector
                                start={beamNodePosition} // Começa no feixe
                                end={cardPosition}      // Termina no card
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