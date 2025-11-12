import React from 'react';
import { Columns, Column, Task } from '../types';
import KanbanColumn from './KanbanColumn';

interface KanbanBoardProps {
    columns: Columns;
    onTaskPointerDown: (e: React.PointerEvent<HTMLDivElement>, task: Task) => void;
    onTaskKeyDown: (e: React.KeyboardEvent<HTMLDivElement>, task: Task) => void;
    onEditRequest: (task: Task, trigger: HTMLElement) => void;
    onDeleteRequest: (task: Task) => void;
    draggingTaskId: string | null;
    keyboardDraggingTaskId: string | null;
    isLoading: boolean;
    deletingTaskId: string | null;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ 
    columns, 
    onTaskPointerDown, 
    onTaskKeyDown,
    onEditRequest,
    onDeleteRequest,
    draggingTaskId,
    keyboardDraggingTaskId,
    isLoading,
    deletingTaskId,
}) => {
    return (
        <main className="kanban-board">
            {(Object.values(columns) as Column[]).map(column => (
                <KanbanColumn
                    key={column.id}
                    column={column}
                    onTaskPointerDown={onTaskPointerDown}
                    onTaskKeyDown={onTaskKeyDown}
                    onEditRequest={onEditRequest}
                    onDeleteRequest={onDeleteRequest}
                    draggingTaskId={draggingTaskId}
                    keyboardDraggingTaskId={keyboardDraggingTaskId}
                    isLoading={isLoading}
                    deletingTaskId={deletingTaskId}
                />
            ))}
        </main>
    );
};

export default React.memo(KanbanBoard);
