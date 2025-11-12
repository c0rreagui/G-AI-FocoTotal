import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { Task, Context } from '../types';
import TimelineEventCard from './TimelineEventCard';
import TimelineControls from './TimelineControls';
import { useTimelineDnD } from '../hooks/useTimelineDnD';
import { useTimelinePan } from '../hooks/useTimelinePan';
import { CONTEXTS } from '../constants';

interface TimelineViewProps {
    tasks: Task[];
    onEditRequest: (task: Task, trigger: HTMLElement) => void;
    onDateDoubleClick: (date: string) => void;
    onUpdateTask: (task: Partial<Task> & {id: string}) => Promise<void>;
}

type ZoomLevel = 'month' | 'week' | 'day';
type Grouping = 'date' | 'context';
type Density = 'default' | 'compact';

const getTodayString = () => new Date().toISOString().split('T')[0];

const TimelineView: React.FC<TimelineViewProps> = (props) => {
    const { tasks, onEditRequest, onDateDoubleClick, onUpdateTask } = props;
    
    const [zoom, setZoom] = useState<ZoomLevel>('day');
    const [grouping, setGrouping] = useState<Grouping>('date');
    const [density, setDensity] = useState<Density>('default');
    const [searchQuery, setSearchQuery] = useState('');

    const todayRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());
    const observer = useRef<IntersectionObserver | null>(null);

    const { draggingTaskId, handleTaskPointerDown } = useTimelineDnD({ onUpdateTask });
    const { containerProps } = useTimelinePan(containerRef);

    const scrollToToday = useCallback(() => {
        const todayMarker = containerRef.current?.querySelector('.is-today');
        todayMarker?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, []);

    const tasksWithDueDate = useMemo(() => tasks.filter(task => 
        !!task.dueDate && task.title.toLowerCase().includes(searchQuery.toLowerCase())
    ), [tasks, searchQuery]);

    // FIX: Explicitly typed the return value of the useMemo hook to ensure correct type inference for `dateMap`.
    const { dateMap, startDate, endDate } = useMemo((): { dateMap: Map<string, Task[]>; startDate: Date; endDate: Date } => {
        if (tasksWithDueDate.length === 0) {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return { dateMap: new Map<string, Task[]>(), startDate: today, endDate: tomorrow };
        }
        const sortedTasks = [...tasksWithDueDate].sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
        const firstDate = new Date(sortedTasks[0].dueDate!);
        const lastDate = new Date(sortedTasks[sortedTasks.length - 1].dueDate!);
        
        const dateMap = new Map<string, Task[]>();
        sortedTasks.forEach(task => {
            const dateStr = task.dueDate!;
            if (!dateMap.has(dateStr)) dateMap.set(dateStr, []);
            dateMap.get(dateStr)!.push(task);
        });

        return { dateMap, startDate: firstDate, endDate: lastDate };
    }, [tasksWithDueDate]);

    const dateArray = useMemo(() => {
        const arr = [];
        let current = new Date(startDate);
        current.setDate(current.getDate() - 7); // Padding
        let end = new Date(endDate);
        end.setDate(end.getDate() + 7); // Padding

        while (current <= end) {
            arr.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        return arr;
    }, [startDate, endDate]);

    // FIX: Adicionada anotação de tipo explícita para `tasks` no callback do map para corrigir a falha de inferência de tipo.
    const maxTasksPerDay = useMemo(() => Math.max(1, ...Array.from(dateMap.values()).map((tasks: Task[]) => tasks.length)), [dateMap]);
    
    const todayString = getTodayString();
    
    const setItemRef = useCallback(node => {
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setVisibleItems(prev => new Set(prev).add(entry.target.getAttribute('data-date-key')!));
                }
            });
        }, { root: containerRef.current, rootMargin: '0px 500px 0px 500px' });
        if (node) observer.current.observe(node);
    }, []);

    useEffect(() => {
        // The timeout ensures that the browser has had time to calculate layout
        // after the tasks are rendered, making the scroll more reliable.
        const timer = setTimeout(() => {
            scrollToToday();
        }, 100);

        return () => clearTimeout(timer);
    }, [tasks, scrollToToday]);

    const timelineClasses = [
        'timeline-view',
        `zoom-${zoom}`,
        `grouping-${grouping}`,
        `density-${density}`,
    ].join(' ');

    const contextLanes = Object.keys(CONTEXTS);

    return (
        <div className={timelineClasses}>
            <TimelineControls 
                tasks={tasksWithDueDate}
                onUpdateTasks={(tasksToUpdate) => Promise.all(tasksToUpdate.map(t => onUpdateTask(t)))}
                zoom={zoom} onZoomChange={setZoom}
                grouping={grouping} onGroupingChange={setGrouping}
                density={density} onDensityChange={setDensity}
                searchQuery={searchQuery} onSearchChange={setSearchQuery}
                onScrollToToday={scrollToToday}
            />
            <div className="timeline-container" ref={containerRef} {...containerProps}>
                <div className="timeline-grid" role="list" aria-label="Linha do Tempo de Tarefas">
                    {grouping === 'context' && (
                        <div className="timeline-context-labels">
                            {contextLanes.map(context => <div key={context} className="timeline-context-label">{CONTEXTS[context as Context]?.label}</div>)}
                        </div>
                    )}
                    <div className="timeline-scroll-content">
                        {grouping === 'date' && <div className="sacred-timeline-line"></div>}
                        {dateArray.map((dateObj, index) => {
                            const dateKey = dateObj.toISOString().split('T')[0];
                            const isToday = dateKey === todayString;
                            const isVisible = visibleItems.has(dateKey) || isToday;
                            const tasksForDay = dateMap.get(dateKey) || [];
                            const milestones = tasksForDay.filter(t => t.context === 'Marco');
                            const regularTasks = tasksForDay.filter(t => t.context !== 'Marco');
                            
                            const heatmapOpacity = Math.min(0.7, (tasksForDay.length / maxTasksPerDay) * 0.7);

                            return (
                                <div
                                    className={`timeline-day-group ${isToday ? 'is-today' : ''}`}
                                    key={dateKey}
                                    role="listitem"
                                    data-date-key={dateKey}
                                    ref={index === 0 ? setItemRef : null} // Observe only the first for simplicity
                                    style={{ '--heatmap-opacity': heatmapOpacity } as React.CSSProperties}
                                    onDoubleClick={() => onDateDoubleClick(dateKey)}
                                >
                                     <div className="timeline-date-marker-container">
                                        <div className="timeline-date-marker" ref={isToday ? todayRef : null}>
                                            <span className="timeline-date-weekday">{dateObj.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' })}</span>
                                            <span className="timeline-date-day">{dateObj.toLocaleDateString('pt-BR', { day: '2-digit', timeZone: 'UTC' })}</span>
                                        </div>
                                    </div>

                                    {isVisible && (
                                        <>
                                            {grouping === 'date' ? (
                                                <>
                                                     <div className="timeline-milestones">
                                                        {milestones.map(task => <TimelineEventCard key={task.id} task={task} onEditRequest={onEditRequest} onUpdateTask={onUpdateTask} onPointerDown={handleTaskPointerDown} isDragging={draggingTaskId === task.id} />)}
                                                    </div>
                                                    <div className="timeline-events">
                                                        {regularTasks.map((task, idx) => (
                                                            <TimelineEventCard key={task.id} task={task} position={idx % 2 === 0 ? 'top' : 'bottom'} onEditRequest={onEditRequest} onUpdateTask={onUpdateTask} onPointerDown={handleTaskPointerDown} isDragging={draggingTaskId === task.id} />
                                                        ))}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="timeline-context-lanes">
                                                    {contextLanes.map(context => (
                                                        <div key={context} className="timeline-lane" data-context={context}>
                                                            {tasksForDay.filter(t => t.context === context).map(task => (
                                                                <TimelineEventCard key={task.id} task={task} onEditRequest={onEditRequest} onUpdateTask={onUpdateTask} onPointerDown={handleTaskPointerDown} isDragging={draggingTaskId === task.id} />
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                 {tasksWithDueDate.length === 0 && (
                    <div className="timeline-empty-state">
                        <svg className="timeline-empty-icon" xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h2.5l1-4.5 3 9 2-7 2.5 5H21"/></svg>
                        <h2>Nenhuma tarefa com data de entrega</h2>
                        <p>Adicione datas de entrega às suas tarefas para tecer sua linha do tempo.</p>
                    </div>
                )}
            </div>
            {draggingTaskId && <div className="timeline-drop-placeholder" />}
        </div>
    );
};

export default TimelineView;