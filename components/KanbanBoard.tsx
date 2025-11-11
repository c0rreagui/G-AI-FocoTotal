import React from 'react';
import { Columns, ColumnId, Task, Column } from '../types';
import KanbanColumn from './KanbanColumn';

interface KanbanBoardProps {
    columns: Columns;
    setDraggedTask: (task: Task | null) => void;
    moveTask: (taskId: string, targetColumnId: ColumnId, targetIndex: number) => void;
    onEditTask: (task: Task) => void;
    // Props para o D&D por toque
    onTaskTouchStart: (e: React.TouchEvent<HTMLButtonElement>, task: Task) => void;
    touchDropTarget: ColumnId | null;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ columns, setDraggedTask, moveTask, onEditTask, onTaskTouchStart, touchDropTarget }) => {
    return (
        <main className="kanban-board">
            {(Object.values(columns) as Column[]).map(column => (
                <KanbanColumn
                    key={column.id}
                    column={column}
                    setDraggedTask={setDraggedTask}
                    moveTask={moveTask}
                    onEditTask={onEditTask}
                    onTaskTouchStart={onTaskTouchStart}
                    isTouchDropTarget={touchDropTarget === column.id}
                />
            ))}
        </main>
    );
};

export default KanbanBoard;