import React from 'react';
// FIX: The `Column` type is required for the type assertion on `Object.values`.
import { Columns, ColumnId, Task, Column } from '../types';
import KanbanColumn from './KanbanColumn';

interface KanbanBoardProps {
    columns: Columns;
    setDraggedTask: (task: Task | null) => void;
    moveTask: (taskId: string, targetColumnId: ColumnId, targetIndex: number) => void;
    onEditTask: (task: Task) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ columns, setDraggedTask, moveTask, onEditTask }) => {
    return (
        <main className="kanban-board">
            {/* FIX: Cast the result of Object.values to Column[] to resolve the type inference issue. */}
            {/* TypeScript was inferring `unknown[]`, causing an error when accessing `column.id`. */}
            {(Object.values(columns) as Column[]).map(column => (
                <KanbanColumn
                    key={column.id}
                    column={column}
                    setDraggedTask={setDraggedTask}
                    moveTask={moveTask}
                    onEditTask={onEditTask}
                />
            ))}
        </main>
    );
};

export default KanbanBoard;