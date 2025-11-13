import React, { useMemo, useRef, useCallback, useState, useLayoutEffect } from 'react';
import { Task, Context } from '../types';
import TimelineEventCard from './TimelineEventCard';
import TimelineControls from './TimelineControls';
import TimelineWave from './TimelineWave'; // Importar o novo componente de onda
import { useTimelineDnD } from '../hooks/useTimelineDnD';
import { useTimelinePan } from '../hooks/useTimelinePan';
import { useTimelineKeyboardNav } from '../hooks/useTimelineKeyboardNav';
import { CONTEXTS } from '../constants';

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

const getTodayString = () => new Date().toISOString().split('T')[0];

interface DateMapEntry {
    milestones: Task[];
    regularTasks: Task[];
}

// Custom hook to process and structure timeline data
const useTimelineData = (tasks: Task[], searchQuery: string) => {
    const tasksWithDueDate = useMemo(() =>
        tasks.filter(task =>
            !!task.dueDate && task.title.toLowerCase().includes(searchQuery.toLowerCase())
        ), [tasks, searchQuery]);

    const { dateMap, startDate, endDate } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const map = new Map<string, DateMapEntry>();
        tasksWithDueDate.forEach(task => {
            const dateStr = task.dueDate!;
            if (!map.has(dateStr)) {
                map.set(dateStr, { milestones: [], regularTasks: [] });
            }
            const entry = map.get(dateStr)!;
            if (task.context === 'Marco') {
                entry.milestones.push(task);
            } else {
                entry.regularTasks.push(task);
            }
        });

        if (tasksWithDueDate.length === 0) {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return { dateMap: map, startDate: today, endDate: tomorrow };
        }

        const taskDates = tasksWithDueDate.map(t => new Date(t.dueDate!));
        const firstDate = new Date(Math.min(...taskDates.map(d => d.getTime())));
        const lastTaskDate = new Date(Math.max(...taskDates.map(d => d.getTime())));

        const finalEndDate = lastTaskDate > today ? lastTaskDate : today;

        return { dateMap: map, startDate: firstDate, endDate: finalEndDate };
    }, [tasksWithDueDate]);

    const dateArray = useMemo(() => {
        const PRE_PADDING_DAYS = 7;
        const POST_PADDING_DAYS = 14;

        const arr = [];
        let current = new Date(startDate);
        current.setDate(current.getDate() - PRE_PADDING_DAYS);
        let end = new Date(endDate);
        end.setDate(end.getDate() + POST_PADDING_DAYS);

        while (current <= end) {
            arr.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        return arr;
    }, [startDate, endDate]);
    
    return { tasksWithDueDate, dateMap, dateArray };
};


const TimelineView: React.FC<TimelineViewProps> = (props) => {
    const { 
        tasks, searchQuery, onSearchChange, onEditRequest, onAddTaskRequest,
        onDateDoubleClick, onUpdateTask 
    } = props;
    
    const [zoom, setZoom] = useState<ZoomLevel>('day');
    const [grouping, setGrouping] = useState<Grouping>('date');
    const [density, setDensity] = useState<Density>('default');
    const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
    const [focusOnTaskId, setFocusOnTaskId] = useState<string | null>(null);
    const [cardLayouts, setCardLayouts] = useState<Record<string, { rect: DOMRect; position: 'top' | 'bottom' }>>({});
    const [gridSize, setGridSize] = useState({ width: 0, height: 0 });

    const containerRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    const { tasksWithDueDate, dateMap, dateArray } = useTimelineData(tasks, searchQuery);
    
    const { draggingTaskId, handleTaskPointerDown } = useTimelineDnD({ 
        onUpdateTask,
        onDropComplete: setFocusOnTaskId 
    });
    
    const { containerProps } = useTimelinePan(containerRef);

    const { liftedTaskId, announcement, containerKeyDownHandler } = useTimelineKeyboardNav({
        containerRef,
        dateArray,
        onUpdateTask,
    });

    const scrollToToday = useCallback(() => {
        const todayMarker = containerRef.current?.querySelector('.is-today');
        todayMarker?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, []);

    useLayoutEffect(() => {
        scrollToToday();
    }, [tasks, scrollToToday]);
    
    // Mede a posição dos cards e o tamanho da grade
    useLayoutEffect(() => {
        if (!gridRef.current) return;
        
        const layouts: Record<string, { rect: DOMRect; position: 'top' | 'bottom' }> = {};
        const cardElements = gridRef.current.querySelectorAll<HTMLElement>('.timeline-event');
        const gridRect = gridRef.current.getBoundingClientRect();

        cardElements.forEach(cardEl => {
            const taskId = cardEl.dataset.taskId;
            if (taskId && cardEl.dataset.context !== 'Marco') {
                const rect = cardEl.getBoundingClientRect();
                layouts[taskId] = {
                    rect: new DOMRect(
                        rect.left - gridRect.left,
                        rect.top - gridRect.top,
                        rect.width,
                        rect.height
                    ),
                    position: cardEl.dataset.position as 'top' | 'bottom',
                };
            }
        });
        setCardLayouts(layouts);
        setGridSize({ width: gridRef.current.scrollWidth, height: gridRef.current.scrollHeight });

    }, [tasksWithDueDate, zoom, density]);

    useLayoutEffect(() => {
        if (focusOnTaskId) {
            const taskElement = containerRef.current?.querySelector(`[data-task-id="${focusOnTaskId}"]`) as HTMLElement;
            if (taskElement) {
                taskElement.focus();
            }
            setFocusOnTaskId(null);
        }
    }, [tasks, focusOnTaskId]);

    const handleCompleteRequest = useCallback((taskToComplete: Task) => {
        if (completingTaskId) return;
        setCompletingTaskId(taskToComplete.id);
        setTimeout(() => {
            props.onUpdateTask({ id: taskToComplete.id, columnId: 'Concluído' })
                .finally(() => setCompletingTaskId(null));
        }, 800);
    }, [completingTaskId, props.onUpdateTask]);
    
    const todayString = getTodayString();
    const timelineClasses = `timeline-view zoom-${zoom} grouping-${grouping} density-${density}`;
    const contextLanes = Object.keys(CONTEXTS);

    return (
        <div className={timelineClasses}>
             <div role="alert" aria-live="assertive" className="sr-only">{announcement}</div>
            <TimelineControls 
                tasks={tasksWithDueDate} onUpdateTasks={(tasksToUpdate) => Promise.all(tasksToUpdate.map(t => onUpdateTask(t)))}
                zoom={zoom} onZoomChange={setZoom} grouping={grouping} onGroupingChange={setGrouping}
                density={density} onDensityChange={setDensity} searchQuery={searchQuery} onSearchChange={onSearchChange}
                onScrollToToday={scrollToToday}
            />
            <div className="timeline-container" ref={containerRef} {...containerProps} onKeyDown={containerKeyDownHandler}>
                {grouping === 'date' && (
                    <TimelineWave
                        tasks={tasksWithDueDate}
                        cardLayouts={cardLayouts}
                        gridSize={gridSize}
                        gridRef={gridRef}
                    />
                )}
                <div className="timeline-grid" ref={gridRef} role="list" aria-label="Linha do Tempo de Tarefas">
                    {grouping === 'context' && (
                        <div className="timeline-context-labels">
                            {contextLanes.map(context => <div key={context} className="timeline-context-label">{CONTEXTS[context as Context]?.label}</div>)}
                        </div>
                    )}
                    
                    {dateArray.map((dateObj) => {
                        const dateKey = dateObj.toISOString().split('T')[0];
                        const dayData = dateMap.get(dateKey);
                        const tasksForDay = [...(dayData?.milestones || []), ...(dayData?.regularTasks || [])];
                        
                        return (
                            <div
                                className={`timeline-day-group ${dateKey === todayString ? 'is-today' : ''}`}
                                key={dateKey} role="listitem" tabIndex={0} data-date-key={dateKey}
                                aria-label={`${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeZone: 'UTC' }).format(dateObj)} com ${tasksForDay.length} tarefas.`}
                                onDoubleClick={() => onDateDoubleClick(dateKey)}
                            >
                                 <div className="timeline-date-marker-container">
                                    <div className="timeline-date-marker">
                                        <span className="timeline-date-weekday">{dateObj.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' })}</span>
                                        <span className="timeline-date-day">{dateObj.toLocaleDateString('pt-BR', { day: '2-digit', timeZone: 'UTC' })}</span>
                                    </div>
                                </div>
                                {grouping === 'date' ? (
                                    <div className="timeline-events-container">
                                        <div className="timeline-milestones">
                                            {(dayData?.milestones || []).map(task => <TimelineEventCard key={task.id} task={task} onEditRequest={onEditRequest} onUpdateTask={onUpdateTask} onPointerDown={handleTaskPointerDown} isDragging={draggingTaskId === task.id} onCompleteRequest={handleCompleteRequest} isCompleting={completingTaskId === task.id} searchQuery={searchQuery} dateId={`timeline-date-${dateKey}`} isKeyboardDragging={liftedTaskId === task.id}/>)}
                                        </div>
                                        <div className="timeline-events-column timeline-events-top">
                                            {(dayData?.regularTasks || []).filter((_, i) => i % 2 === 0).map(task => <TimelineEventCard key={task.id} task={task} position='top' onEditRequest={onEditRequest} onUpdateTask={onUpdateTask} onPointerDown={handleTaskPointerDown} isDragging={draggingTaskId === task.id} onCompleteRequest={handleCompleteRequest} isCompleting={completingTaskId === task.id} searchQuery={searchQuery} dateId={`timeline-date-${dateKey}`} isKeyboardDragging={liftedTaskId === task.id}/>)}
                                        </div>
                                        <div className="timeline-events-column timeline-events-bottom">
                                            {(dayData?.regularTasks || []).filter((_, i) => i % 2 !== 0).map(task => <TimelineEventCard key={task.id} task={task} position='bottom' onEditRequest={onEditRequest} onUpdateTask={onUpdateTask} onPointerDown={handleTaskPointerDown} isDragging={draggingTaskId === task.id} onCompleteRequest={handleCompleteRequest} isCompleting={completingTaskId === task.id} searchQuery={searchQuery} dateId={`timeline-date-${dateKey}`} isKeyboardDragging={liftedTaskId === task.id}/>)}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="timeline-context-lanes">
                                        {contextLanes.map(context => (
                                            <div key={context} className="timeline-lane" data-context={context}>
                                                {tasksForDay.filter(t => t.context === context).map(task => <TimelineEventCard key={task.id} task={task} onEditRequest={onEditRequest} onUpdateTask={onUpdateTask} onPointerDown={handleTaskPointerDown} isDragging={draggingTaskId === task.id} onCompleteRequest={handleCompleteRequest} isCompleting={completingTaskId === task.id} searchQuery={searchQuery} dateId={`timeline-date-${dateKey}`} isKeyboardDragging={liftedTaskId === task.id} />)}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                {tasksWithDueDate.length === 0 && (
                    <div className="timeline-empty-state">
                        <svg className="timeline-empty-icon" xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h2.5l1-4.5 3 9 2-7 2.5 5H21"/></svg>
                        <h2>Nenhuma tarefa com data de entrega</h2>
                        <p>Adicione datas de entrega às suas tarefas para tecer sua linha do tempo.</p>
                        <button className="btn btn-secondary" onClick={onAddTaskRequest}>Adicionar Tarefa com Data</button>
                    </div>
                )}
            </div>
            {draggingTaskId && <div className="timeline-drop-placeholder" />}
        </div>
    );
};

export default TimelineView;