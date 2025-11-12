import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Task } from '../types';
import { CONTEXTS } from '../constants';
import Tooltip from './ui/Tooltip';

interface TimelineEventCardProps {
    task: Task;
    position?: 'top' | 'bottom';
    onEditRequest: (task: Task, trigger: HTMLElement) => void;
    onUpdateTask: (task: Partial<Task> & {id: string}) => Promise<void>;
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>, task: Task) => void;
    isDragging: boolean;
    onCompleteRequest: (task: Task) => void;
    isCompleting: boolean;
    searchQuery: string;
    dateId: string;
    isKeyboardDragging: boolean;
    style?: React.CSSProperties;
}

const TimelineEventCard: React.FC<TimelineEventCardProps> = (props) => {
    const { 
        task, position, onEditRequest, onUpdateTask, onPointerDown, isDragging,
        onCompleteRequest, isCompleting, searchQuery, dateId, isKeyboardDragging,
        style
    } = props;
    
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [title, setTitle] = useState(task.title);
    const titleInputRef = useRef<HTMLInputElement>(null);
    const completeButtonRef = useRef<HTMLButtonElement>(null);

    const contextColor = task.context ? CONTEXTS[task.context]?.color : 'var(--primary)';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = task.dueDate && new Date(task.dueDate) < today && task.columnId !== 'Concluído';

    let status = 'a-fazer'; // Padrão para 'A Fazer'
    if (task.columnId === 'Concluído') {
        status = 'concluido';
    } else if (isOverdue) {
        status = 'atrasado';
    } else if (task.columnId === 'Em Progresso') {
        status = 'em-progresso';
    }

    const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
        // Ignora o clique se ele veio do botão de concluir, que tem seu próprio handler.
        if (completeButtonRef.current && completeButtonRef.current.contains(e.target as Node)) {
            return;
        }

        if ((e.target as HTMLElement).tagName.toLowerCase() === 'h4') {
             setIsEditingTitle(true);
        } else {
             onEditRequest(task, e.currentTarget);
        }
    };
    
    const handleTitleBlur = () => {
        if (title.trim() && title !== task.title) {
            onUpdateTask({ id: task.id, title });
        } else {
            setTitle(task.title);
        }
        setIsEditingTitle(false);
    };

    useEffect(() => {
        if (isEditingTitle) {
            titleInputRef.current?.select();
        }
    }, [isEditingTitle]);
    
    const handleCompleteClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Previne o clique no card
        onCompleteRequest(task);
    };

    const handlePointerDownWrapper = (e: React.PointerEvent<HTMLDivElement>) => {
        // Não iniciar arrastar se o clique foi no botão de concluir
        if (completeButtonRef.current && completeButtonRef.current.contains(e.target as Node)) {
            return;
        }
        onPointerDown(e, task);
    };

    const TooltipContent = () => (
        <div className="timeline-tooltip-content">
            <strong>{task.title}</strong>
            {task.description && <p>{task.description}</p>}
        </div>
    );
    
    const classNames = [
        'timeline-event',
        isDragging ? 'is-dragging' : '',
        isCompleting ? 'is-completing' : '',
        isKeyboardDragging ? 'is-keyboard-dragging' : ''
    ].filter(Boolean).join(' ');

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

    if (task.context === 'Marco') {
        const ariaLabel = `Marco: ${task.title}`;
        return (
             <Tooltip tip={ariaLabel} position="top">
                <div
                    className="timeline-milestone-marker"
                    role="button"
                    tabIndex={0}
                    aria-label={ariaLabel}
                    aria-describedby={dateId}
                    onClick={(e) => onEditRequest(task, e.currentTarget)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onEditRequest(task, e.currentTarget); }}
                    onPointerDown={(e) => onPointerDown(e, task)}
                    data-task-id={task.id}
                    style={{ '--context-color': contextColor } as React.CSSProperties}
                >
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 12l10 10 10-12L12 2z"></path></svg>
                </div>
            </Tooltip>
        );
    }

    return (
        <div 
            className={classNames}
            data-position={position} 
            data-status={status}
            data-task-id={task.id}
            onPointerDown={handlePointerDownWrapper}
            aria-describedby={dateId}
            style={style}
        >
            <div className="timeline-event-connector" style={{ '--context-color': contextColor } as React.CSSProperties}></div>
             <Tooltip tip={<TooltipContent />} position={position === 'top' ? 'bottom' : 'top'}>
                <div 
                    className="timeline-event-card"
                    style={{ '--context-color': contextColor } as React.CSSProperties}
                    role="button" 
                    tabIndex={isCompleting ? -1 : 0}
                    aria-labelledby={`timeline-task-${task.id}`}
                    onClick={isCompleting ? undefined : handleCardClick}
                    onKeyDown={(e) => { if (!isCompleting && (e.key === 'Enter' || e.key === ' ')) handleCardClick(e as any); }}
                >
                    <div className="timeline-card-header">
                        {isEditingTitle ? (
                             <input
                                ref={titleInputRef}
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onBlur={handleTitleBlur}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleTitleBlur(); if(e.key === 'Escape') { setIsEditingTitle(false); setTitle(task.title); } }}
                                className="timeline-title-input"
                            />
                        ) : (
                             <h4 id={`timeline-task-${task.id}`}>{highlightedTitle}</h4>
                        )}
                        {task.columnId !== 'Concluído' && !isCompleting && (
                             <button
                                ref={completeButtonRef}
                                className="icon-btn timeline-complete-btn"
                                onClick={handleCompleteClick}
                                aria-label={`Concluir tarefa ${task.title}`}
                                title="Concluir Tarefa"
                            >
                                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </button>
                        )}
                        {task.columnId === 'Concluído' && (
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
            </Tooltip>
        </div>
    );
};

export default React.memo(TimelineEventCard);