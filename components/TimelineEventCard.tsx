import React from 'react';
import { Task } from '../types';
import { CONTEXTS } from '../constants';

interface TimelineEventCardProps {
    task: Task;
    position: 'top' | 'bottom';
}

const TimelineEventCard: React.FC<TimelineEventCardProps> = ({ task, position }) => {
    const contextColor = task.context ? CONTEXTS[task.context]?.color : 'var(--primary)';

    return (
        <div className="timeline-event" data-position={position} role="group" aria-labelledby={`timeline-task-${task.id}`}>
            <div className="timeline-event-connector" style={{ '--context-color': contextColor } as React.CSSProperties}></div>
            <div className="timeline-event-card" style={{ '--context-color': contextColor } as React.CSSProperties}>
                <h4 id={`timeline-task-${task.id}`}>{task.title}</h4>
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