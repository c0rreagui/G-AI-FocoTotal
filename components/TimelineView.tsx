import React, { useMemo } from 'react';
import { Task } from '../types';
import TimelineEventCard from './TimelineEventCard';

interface TimelineViewProps {
    tasks: Task[];
}

interface GroupedTasks {
    [date: string]: Task[];
}

const TimelineView: React.FC<TimelineViewProps> = ({ tasks }) => {

    const sortedAndGroupedTasks = useMemo(() => {
        const tasksWithDueDate = tasks.filter(task => !!task.dueDate);
        
        tasksWithDueDate.sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
        
        const grouped = tasksWithDueDate.reduce((acc: GroupedTasks, task) => {
            const date = task.dueDate!;
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(task);
            return acc;
        }, {});
        
        return Object.entries(grouped).map(([date, tasks]) => ({ date, tasks }));

    }, [tasks]);

    return (
        <div className="timeline-view" role="list" aria-label="Linha do Tempo de Tarefas">
            <div className="timeline-container">
                <svg className="sacred-timeline-line" width="100%" height="100%" preserveAspectRatio="none">
                    <defs>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    <path d="M 0 50 Q 100 30, 200 50 T 400 50 T 600 50 T 800 50 T 1000 50 T 1200 50 T 1400 50 T 1600 50 T 1800 50 T 2000 50" 
                          stroke="var(--primary-glow)" 
                          strokeWidth="2" 
                          fill="none" 
                          filter="url(#glow)"
                          className="timeline-path"
                          />
                </svg>

                {sortedAndGroupedTasks.map(({ date, tasks }) => (
                    <div className="timeline-day-group" key={date} role="listitem">
                        <div className="timeline-date-marker">
                             <div className="timeline-date-text">
                                {new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })}
                            </div>
                        </div>
                        <div className="timeline-events">
                            {tasks.map((task, index) => (
                                <TimelineEventCard key={task.id} task={task} position={index % 2 === 0 ? 'top' : 'bottom'} />
                            ))}
                        </div>
                    </div>
                ))}

                 {sortedAndGroupedTasks.length === 0 && (
                    <div className="timeline-empty-state">
                        <h2>Nenhuma tarefa com data de entrega</h2>
                        <p>Adicione datas de entrega às suas tarefas para visualizá-las aqui.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimelineView;