import React from 'react';
import { Task } from '../types';
import { CONTEXTS } from '../constants';

interface TaskCardProps {
    task: Task;
    setDraggedTask: (task: Task | null) => void;
    onClick: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, setDraggedTask, onClick }) => {
    
    const handleDragStart = (e: React.DragEvent<HTMLButtonElement>) => {
        e.dataTransfer.setData('taskId', task.id);
        setDraggedTask(task);
        e.currentTarget.classList.add('dragging');
    };

    const handleDragEnd = (e: React.DragEvent<HTMLButtonElement>) => {
        setDraggedTask(null);
        e.currentTarget.classList.remove('dragging');
    };

    const isDue = task.dueDate && new Date(task.dueDate) < new Date();

    return (
        <button 
            className="task-card" 
            draggable 
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={onClick}
            data-context={task.context}
        >
            <div className="task-header">
                <h3>{task.title}</h3>
            </div>
            {task.description && <p className="description-snippet">{task.description}</p>}
            <div className="task-footer">
                {task.context && (
                    <span className="context-tag" style={{ backgroundColor: CONTEXTS[task.context]?.color }}>
                        {CONTEXTS[task.context]?.label}
                    </span>
                )}
                {task.dueDate && <span className={`due-date ${isDue ? 'is-due' : ''}`}>{new Date(task.dueDate).toLocaleDateString('pt-BR')}</span>}
            </div>
        </button>
    );
};

export default TaskCard;