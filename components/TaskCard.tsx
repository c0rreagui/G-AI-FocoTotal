import React, { useRef } from 'react';
import { Task } from '../types';
import { CONTEXTS } from '../constants';

interface TaskCardProps {
    task: Task;
    setDraggedTask: (task: Task | null) => void;
    onClick: () => void;
    // Props para o D&D por toque
    onTouchStart: (e: React.TouchEvent<HTMLButtonElement>, task: Task) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, setDraggedTask, onClick, onTouchStart }) => {
    const pressTimer = useRef<number | null>(null);
    const isDraggingRef = useRef(false);

    const handleDragStart = (e: React.DragEvent<HTMLButtonElement>) => {
        e.dataTransfer.setData('taskId', task.id);
        setDraggedTask(task);
        e.currentTarget.classList.add('dragging');
    };

    const handleDragEnd = (e: React.DragEvent<HTMLButtonElement>) => {
        setDraggedTask(null);
        e.currentTarget.classList.remove('dragging');
    };
    
    // --- Lógica para toque ---
    const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
        isDraggingRef.current = false;
        pressTimer.current = window.setTimeout(() => {
            isDraggingRef.current = true;
            onTouchStart(e, task);
        }, 200); // Segurar por 200ms para iniciar o arraste
    };
    
    const handleTouchEnd = () => {
        clearTimeout(pressTimer.current!);
        if (!isDraggingRef.current) {
            // Se não estava arrastando, considera um clique
            onClick();
        }
    };
    
    const handleTouchMove = () => {
        // Se mover o dedo, cancela o timer de "clique" para iniciar o arraste imediatamente se o tempo passar
        clearTimeout(pressTimer.current!);
    };

    const isDue = task.dueDate && new Date(task.dueDate) < new Date();

    return (
        <button
            className="task-card"
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={onClick} // Mantido para desktop
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            data-task-id={task.id}
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