import React, { useMemo, useRef, useCallback, useState, Suspense } from 'react';
import { Task } from '../types';
import TimelineControls from './TimelineControls';
import { Canvas } from '@react-three/fiber';
import TimelineScene from './webgl/TimelineScene';
import Spinner from './ui/Spinner';

interface TimelineViewProps {
    tasks: Task[];
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onEditRequest: (task: Task, trigger: HTMLElement) => void;
    onAddTaskRequest: () => void;
    onDateDoubleClick: (date: string) => void;
    onUpdateTask: (task: Partial<Task> & {id: string}) => Promise<void>;
}

type ZoomLevel = 'month' | 'week' | 'day';
type Grouping = 'date' | 'context';
type Density = 'default' | 'compact';


const TimelineView: React.FC<TimelineViewProps> = (props) => {
    const { 
        tasks, searchQuery, onSearchChange, onEditRequest, onAddTaskRequest,
        onDateDoubleClick, onUpdateTask 
    } = props;
    
    const [zoom, setZoom] = useState<ZoomLevel>('day');
    const [grouping, setGrouping] = useState<Grouping>('date');
    const [density, setDensity] = useState<Density>('default');
    
    const tasksWithDueDate = useMemo(() =>
        tasks.filter(task =>
            !!task.dueDate && task.title.toLowerCase().includes(searchQuery.toLowerCase())
        ), [tasks, searchQuery]);

    const timelineClasses = [
        'timeline-view',
        `zoom-${zoom}`,
        `grouping-${grouping}`,
        `density-${density}`,
    ].join(' ');

    return (
        <div className={timelineClasses}>
            <TimelineControls 
                tasks={tasksWithDueDate}
                onUpdateTasks={(tasksToUpdate) => Promise.all(tasksToUpdate.map(t => onUpdateTask(t)))}
                zoom={zoom} onZoomChange={setZoom}
                grouping={grouping} onGroupingChange={setGrouping}
                density={density} onDensityChange={setDensity}
                searchQuery={searchQuery} onSearchChange={onSearchChange}
                onScrollToToday={() => { /* TODO: Implement 3D scroll */ }}
            />
            <div className="timeline-container">
                <Suspense fallback={<div className="loading-indicator"><Spinner size="lg" /> Carregando cena 3D...</div>}>
                    <Canvas
                        camera={{ position: [0, 0, 15], fov: 75 }}
                        gl={{ antialias: true }}
                    >
                        <TimelineScene 
                            tasks={tasksWithDueDate}
                            onEditRequest={onEditRequest}
                        />
                    </Canvas>
                </Suspense>
            </div>
        </div>
    );
};

export default TimelineView;