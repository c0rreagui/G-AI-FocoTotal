import React from 'react';
import { Task } from '../types';
import { CONTEXTS } from '../constants';

interface TimelineEventCardProps {
    task: Task;
    position: 'top' | 'bottom';
    onEditRequest: (task: Task, trigger: HTMLElement) => void;
}

const TimelineEventCard: React.FC<TimelineEventCardProps> = ({ task, position, onEditRequest }) => {
    const contextColor = task.context ? CONTEXTS[task.context]?.color : 'var(--primary)';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = task.dueDate && new Date(task.dueDate) < today && task.columnId !== 'Concluído';
    const isCompleted = task.columnId === 'Concluído';

    let status = 'default';
    if (isCompleted) status = 'completed';
    else if (isOverdue) status = 'overdue';

    const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
        onEditRequest(task, e.currentTarget);
    };

    return (
        <div 
            className="timeline-event" 
            data-position={position} 
            data-status={status}
            role="button" 
            tabIndex={0}
            aria-labelledby={`timeline-task-${task.id}`}
            onClick={handleCardClick}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(e as any); }}
        >
            <div className="timeline-event-connector" style={{ '--context-color': contextColor } as React.CSSProperties}></div>
            <div className="timeline-event-card" style={{ '--context-color': contextColor } as React.CSSProperties}>
                <div className="timeline-card-header">
                    <h4 id={`timeline-task-${task.id}`}>{task.title}</h4>
                    {isCompleted && (
                        <span className="timeline-status-icon" title="Concluído">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        </span>
                    )}
                </div>
                {task.context && (
                    <span className="context-tag" style={{ backgroundColor: 'transparent', color: contextColor, border: `1px solid ${contextColor}` }}>
                        {CONTEXTS[task.context]?.label}
                    </span>
                )}
            </div>
        </div>
    );
};

export default React.memo(TimelineEventCard);