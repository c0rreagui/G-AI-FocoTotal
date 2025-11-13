import React, { useMemo } from 'react';
import { Task } from '../../types';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import EnergyBeam from './EnergyBeam';
import TimelineCard3D from './TimelineCard3D';

interface TimelineSceneProps {
    tasks: Task[];
    onEditRequest: (task: Task, trigger: HTMLElement) => void;
}

const CARD_SPACING_X = 5;
const CARD_SPACING_Y = 3;

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
            
            <EnergyBeam pointCount={dateArray.length} spacing={CARD_SPACING_X} />

            {dateArray.map((date, dateIndex) => {
                const tasksForDay = dateMap.get(date) || [];
                return tasksForDay.map((task, taskIndex) => (
                    <TimelineCard3D
                        key={task.id}
                        task={task}
                        position={[
                            (dateIndex - (dateArray.length - 1) / 2) * CARD_SPACING_X,
                            (taskIndex % 2 === 0 ? 1 : -1) * (Math.floor(taskIndex / 2) * CARD_SPACING_Y + 1.5),
                            0
                        ]}
                        onClick={() => onEditRequest(task, document.body)}
                    />
                ));
            })}

            <EffectComposer>
                <Bloom luminanceThreshold={0.4} luminanceSmoothing={0.9} height={300} intensity={1.5} />
            </EffectComposer>
        </>
    );
};

export default TimelineScene;