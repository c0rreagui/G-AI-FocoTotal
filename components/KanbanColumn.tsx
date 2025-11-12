import React from 'react';
import { Column, Task, Context, ColumnId } from '../types';
import TaskCard from './TaskCard';
import TaskCardSkeleton from './TaskCardSkeleton';

interface KanbanColumnProps {
    column: Column;
    onTaskPointerDown: (e: React.PointerEvent<HTMLDivElement>, task: Task) => void;
    onTaskKeyDown: (e: React.KeyboardEvent<HTMLDivElement>, task: Task) => void;
    onEditRequest: (task: Task, trigger: HTMLElement) => void;
    onDeleteRequest: (task: Task) => void;
    onAddTaskRequest: (columnId: ColumnId) => void;
    draggingTaskId: string | null;
    keyboardDraggingTaskId: string | null;
    isLoading: boolean;
    deletingTaskId: string | null;
    activeFilter: Context | null;
    searchQuery: string;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ 
    column, 
    onTaskPointerDown,
    onTaskKeyDown,
    onEditRequest,
    onDeleteRequest,
    onAddTaskRequest,
    draggingTaskId,
    keyboardDraggingTaskId,
    isLoading,
    deletingTaskId,
    activeFilter,
    searchQuery
}) => {

    const filteredTasks = activeFilter
        ? column.tasks.filter(task => task.context === activeFilter)
        : column.tasks;

    const isAddDisabled = !!activeFilter;

    return (
        <div className="kanban-column" data-column-id={column.id}>
            <div className="kanban-column-header">
                <h2>{column.title} ({!isLoading ? filteredTasks.length : '...'})</h2>
                 <button 
                    className="icon-btn" 
                    aria-label={`Adicionar tarefa em ${column.title}`}
                    onClick={() => onAddTaskRequest(column.id)}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </button>
            </div>
            <div
                className="task-cards-container"
            >
                {isLoading ? (
                    <>
                        <TaskCardSkeleton />
                        <TaskCardSkeleton />
                        <TaskCardSkeleton />
                    </>
                ) : filteredTasks.length > 0 ? (
                    filteredTasks.map((task) => (
                        <TaskCard 
                            key={task.id} 
                            task={task} 
                            onPointerDown={(e) => onTaskPointerDown(e, task)}
                            onKeyDown={(e) => onTaskKeyDown(e, task)}
                            onEditRequest={onEditRequest}
                            onDeleteRequest={onDeleteRequest}
                            isDragging={draggingTaskId === task.id}
                            isKeyboardDragging={keyboardDraggingTaskId === task.id}
                            isDeleting={deletingTaskId === task.id}
                            searchQuery={searchQuery}
                        />
                    ))
                ) : (
                    <div 
                        className="empty-column-state"
                        onClick={!isAddDisabled ? () => onAddTaskRequest(column.id) : undefined}
                        onKeyDown={!isAddDisabled ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAddTaskRequest(column.id); } } : undefined}
                        role={!isAddDisabled ? "button" : undefined}
                        tabIndex={!isAddDisabled ? 0 : -1}
                        aria-label={!isAddDisabled ? `Adicionar tarefa em ${column.title}` : undefined}
                        data-interactive={!isAddDisabled}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        <span>{isAddDisabled ? 'Nenhuma tarefa encontrada' : 'Arraste tarefas para cá'}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default KanbanColumn;