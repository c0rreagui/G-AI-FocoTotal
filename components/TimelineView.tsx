

import React, { useMemo, useState, Suspense } from 'react';
// FIX: The sub-path default imports were causing module resolution errors ("not callable").
// Switched to a single, consistent named import from the 'date-fns' barrel file.
// This is the standard approach for date-fns v2+ and resolves the errors.
import {
    format,
    addDays,
    eachDayOfInterval,
    endOfWeek,
    endOfMonth,
    addHours,
    addWeeks,
    addMonths,
    endOfDay,
    eachHourOfInterval,
    startOfWeek,
    startOfMonth,
    subHours,
    subDays,
    subWeeks,
    subMonths,
    startOfDay,
    setHours
} from 'date-fns';
import { Task, TimelineZoomLevel } from '../types';
import TimelineControls from './TimelineControls';
import { Canvas } from '@react-three/fiber';
import TimelineScene from './webgl/TimelineScene';
import Spinner from './ui/Spinner';

interface TimelineViewProps {
    tasks: Task[];
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onEditRequest: (task: Task, trigger: HTMLElement) => void;
    onDateDoubleClick: (date: string) => void;
    onUpdateTask: (task: Partial<Task> & {id: string}) => Promise<void>;
}

type Grouping = 'date' | 'context';
type Density = 'default' | 'compact';

const formatDateISO = (date: Date): string => {
    return format(date, 'yyyy-MM-dd');
};
const formatHourISO = (date: Date): string => {
    return format(date, 'yyyy-MM-dd HH:00');
}


const TimelineView: React.FC<TimelineViewProps> = (props) => {
    const { 
        tasks, searchQuery, onSearchChange, onEditRequest, 
        onDateDoubleClick, onUpdateTask 
    } = props;
    
    const [zoom, setZoom] = useState<TimelineZoomLevel>('week');
    const [grouping, setGrouping] = useState<Grouping>('date');
    const [density, setDensity] = useState<Density>('default');
    const [currentDate, setCurrentDate] = useState(new Date());

     const handlePrev = () => {
        setCurrentDate(prev => {
            if (zoom === 'hour') return subHours(prev, 24); // Pula um dia inteiro
            if (zoom === 'day') return subDays(prev, 1);
            if (zoom === 'week') return subWeeks(prev, 1);
            if (zoom === 'month') return subMonths(prev, 1);
            return prev;
        });
    };
    const handleNext = () => {
        setCurrentDate(prev => {
            if (zoom === 'hour') return addHours(prev, 24); // Pula um dia inteiro
            if (zoom === 'day') return addDays(prev, 1);
            if (zoom === 'week') return addWeeks(prev, 1);
            if (zoom === 'month') return addMonths(prev, 1);
            return prev;
        });
    };

    const dateArray = useMemo((): string[] => {
        const today = currentDate;
        let interval: { start: Date, end: Date };

        switch (zoom) {
            case 'hour':
                interval = { start: startOfDay(today), end: endOfDay(today) };
                return eachHourOfInterval(interval).map(formatHourISO);
            case 'day':
                interval = { start: subDays(today, 1), end: addDays(today, 1) };
                break;
            case 'month':
                interval = { start: startOfMonth(today), end: endOfMonth(today) };
                break;
            case 'week':
            default:
                interval = { start: startOfWeek(today), end: endOfWeek(today) };
                break;
        }
        
        return eachDayOfInterval(interval).map(formatDateISO);
    }, [zoom, currentDate]);
    
    const tasksWithDueDate = useMemo(() =>
        tasks.filter(task =>
            !!task.dueDate && task.title.toLowerCase().includes(searchQuery.toLowerCase())
        ), [tasks, searchQuery]);

    const tasksForScene = useMemo(() => {
        if (zoom !== 'hour') return tasksWithDueDate;

        const day = formatDateISO(currentDate);
        const tasksForDay = tasksWithDueDate.filter(t => t.dueDate === day);
        
        // Distribui as tarefas do dia em slots horários para visualização
        const workingHoursStart = 9; // Começa às 9h
        const workingHoursSlots = 9; // 9h, 10h, 11h, 12h, 13h, 14h, 15h, 16h, 17h

        return tasksForDay.map((task, index) => {
            const hour = workingHoursStart + (index % workingHoursSlots);
            const hourString = formatHourISO(setHours(currentDate, hour));
            // Atribui temporariamente o dueDate com hora para o posicionamento na cena 3D
            return { ...task, dueDate: hourString };
        });

    }, [zoom, currentDate, tasksWithDueDate]);

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
                onScrollToToday={() => setCurrentDate(new Date())}
                onPrev={handlePrev}
                onNext={handleNext}
            />
            <div className="timeline-container">
                <Suspense fallback={<div className="loading-indicator"><Spinner size="lg" /> Carregando cena 3D...</div>}>
                    <Canvas
                        shadows
                        camera={{ position: [0, 5, 25], fov: 60 }}
                        gl={{ antialias: true }}
                    >
                        <TimelineScene 
                            tasks={tasksForScene}
                            onEditRequest={onEditRequest}
                            dateArray={dateArray}
                            zoom={zoom}
                            onUpdateTask={onUpdateTask}
                            onDateDoubleClick={onDateDoubleClick}
                        />
                    </Canvas>
                </Suspense>
            </div>
        </div>
    );
};

export default TimelineView;