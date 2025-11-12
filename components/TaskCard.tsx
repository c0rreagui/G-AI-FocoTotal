import React, { useState, useRef, useMemo } from 'react';
import { Task } from '../types';
import { CONTEXTS } from '../constants';
import TaskContextMenu from './TaskContextMenu';

interface TaskCardProps {
    task: Task;
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
    onEditRequest: (task: Task, trigger: HTMLElement) => void;
    onDeleteRequest: (task: Task) => void;
    isDragging: boolean;
    isKeyboardDragging: boolean;
    isDeleting: boolean;
    searchQuery: string;
}

const TaskCard: React.FC<TaskCardProps> = (props) => {
    const { task, onPointerDown, onKeyDown, onEditRequest, onDeleteRequest, isDragging, isKeyboardDragging, isDeleting, searchQuery } = props;
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuButtonRef = useRef<HTMLButtonElement>(null);

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Define a hora para o início do dia
    const isDue = task.dueDate && new Date(task.dueDate) < today;
    
    const classNames = [
        'task-card',
        isDragging ? 'task-card--dragging' : '',
        isKeyboardDragging ? 'task-card--keyboard-dragging' : '',
        isDeleting ? 'is-deleting' : ''
    ].filter(Boolean).join(' ');

    const handleEdit = () => {
        setIsMenuOpen(false);
        if (menuButtonRef.current) {
            onEditRequest(task, menuButtonRef.current);
        }
    };

    const handleDelete = () => {
        setIsMenuOpen(false);
        onDeleteRequest(task);
    };
    
    const handlePointerDownWrapper = (e: React.PointerEvent<HTMLDivElement>) => {
        // Não iniciar arrastar se o clique foi no botão do menu
        if (menuButtonRef.current && menuButtonRef.current.contains(e.target as Node)) {
            return;
        }
        onPointerDown(e);
    };
    
    const titleId = `task-title-${task.id}`;
    const descriptionId = `task-description-${task.id}`;

    const highlightedTitle = useMemo(() => {
        if (!searchQuery?.trim()) {
            return task.title;
        }
        const parts = task.title.split(new RegExp(`(${searchQuery})`, 'gi'));
        return (
            <>
                {parts.map((part, i) =>
                    part.toLowerCase() === searchQuery.toLowerCase() ? (
                        <mark key={i}>{part}</mark>
                    ) : (
                        part
                    )
                )}
            </>
        );
    }, [task.title, searchQuery]);

    return (
        <div
            className={classNames}
            onPointerDown={handlePointerDownWrapper}
            onKeyDown={onKeyDown}
            data-task-id={task.id}
            data-context={task.context}
            tabIndex={0}
            role="group"
            aria-labelledby={titleId}
            aria-describedby={task.description ? descriptionId : undefined}
            aria-roledescription="Tarefa arrastável"
        >
            <div className="task-header">
                <h3 id={titleId}>{highlightedTitle}</h3>
                 <div className="task-actions">
                    <button 
                        ref={menuButtonRef}
                        className="icon-btn context-menu-btn" 
                        onClick={() => setIsMenuOpen(prev => !prev)} 
                        aria-haspopup="true"
                        aria-expanded={isMenuOpen}
                        aria-label={`Ações para a tarefa ${task.title}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                    </button>
                    <TaskContextMenu
                        isOpen={isMenuOpen}
                        onClose={() => setIsMenuOpen(false)}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        triggerRef={menuButtonRef}
                    />
                </div>
            </div>
            {task.description && <p id={descriptionId} className="description-full">{task.description}</p>}
            
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