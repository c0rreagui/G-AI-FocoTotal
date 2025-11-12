import React from 'react';
import { Column, Task, Context } from '../types';
import TaskCard from './TaskCard';
import TaskCardSkeleton from './TaskCardSkeleton';

interface KanbanColumnProps {
    column: Column;
    onTaskPointerDown: (e: React.PointerEvent<HTMLDivElement>, task: Task) => void;
    onTaskKeyDown: (e: React.KeyboardEvent<HTMLDivElement>, task: Task) => void;
    onEditRequest: (task: Task, trigger: HTMLElement) => void;
    onDeleteRequest: (task: Task) => void;
    draggingTaskId: string | null;
    keyboardDraggingTaskId: string | null;
    isLoading: boolean;
    deletingTaskId: string | null;
    activeFilter: Context | null;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ 
    column, 
    onTaskPointerDown,
    onTaskKeyDown,
    onEditRequest,
    onDeleteRequest,
    draggingTaskId,
    keyboardDraggingTaskId,
    isLoading,
    deletingTaskId,
    activeFilter
}) => {

    const filteredTasks = activeFilter
        ? column.tasks.filter(task => task.context === activeFilter)
        : column.tasks;

    return (
        <div className="kanban-column" data-column-id={column.id}>
            <div className="kanban-column-header">
                <h2>{column.title} ({!isLoading ? filteredTasks.length : '...'})</h2>
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
                        />
                    ))
                ) : (
                    <div className="empty-column-state">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="12" y1="8" x2="12" y2="16"></line>
                            <line x1="8" y1="12" x2="16" y2="12"></line>
                        </svg>
                        <span>{activeFilter ? 'Nenhuma tarefa encontrada' : 'Arraste tarefas para cá'}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default KanbanColumn;