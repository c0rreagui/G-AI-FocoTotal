import React from 'react';
import { Task } from '../types';
import { CONTEXTS } from '../constants';

interface TaskCardProps {
    task: Task;
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
    isDragging: boolean;
    isKeyboardDragging: boolean;
    isDeleting: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onPointerDown, onKeyDown, isDragging, isKeyboardDragging, isDeleting }) => {

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Define a hora para o início do dia
    const isDue = task.dueDate && new Date(task.dueDate) < today;
    
    const classNames = [
        'task-card',
        isDragging ? 'task-card--dragging' : '',
        isKeyboardDragging ? 'task-card--keyboard-dragging' : '',
        isDeleting ? 'is-deleting' : ''
    ].filter(Boolean).join(' ');

    return (
        <div
            className={classNames}
            onPointerDown={onPointerDown}
            onKeyDown={onKeyDown}
            data-task-id={task.id}
            data-context={task.context}
            tabIndex={0}
            role="button"
            aria-roledescription="Tarefa arrastável"
        >
            <div className="task-header">
                <h3>{task.title}</h3>
            </div>
            {task.description && <p className="description-snippet">{task.description}</p>}
            <div className="task-footer">
                {task.context && (
                    <span className="context-tag">
                        {CONTEXTS[task.context]?.label}
                    </span>
                )}
                {task.dueDate && <span className={`due-date ${isDue ? 'is-due' : ''}`}>{new Date(task.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>}
            </div>
        </div>
    );
};

export default React.memo(TaskCard);