import React, { useState } from 'react';
import { Column, ColumnId, Task } from '../types';
import TaskCard from './TaskCard';

interface KanbanColumnProps {
    column: Column;
    setDraggedTask: (task: Task | null) => void;
    moveTask: (taskId: string, targetColumnId: ColumnId, targetIndex: number) => void;
    onEditTask: (task: Task) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ column, setDraggedTask, moveTask, onEditTask }) => {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        if (taskId) {
            const dropY = e.clientY;
            const cards = Array.from(e.currentTarget.querySelectorAll('.task-card'));
            let newIndex = column.tasks.length;

            for (let i = 0; i < cards.length; i++) {
                const card = cards[i] as HTMLElement;
                const rect = card.getBoundingClientRect();
                if (dropY < rect.top + rect.height / 2) {
                    newIndex = i;
                    break;
                }
            }
            
            moveTask(taskId, column.id, newIndex);
        }
        setIsDragOver(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(true);
    };
    
    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    return (
        <div className="kanban-column">
            <div className="kanban-column-header">
                <h2>{column.title} ({column.tasks.length})</h2>
            </div>
            <div
                className={`task-cards-container ${isDragOver ? 'drag-over-active' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                {column.tasks.length > 0 ? (
                    column.tasks.map(task => (
                        <TaskCard 
                            key={task.id} 
                            task={task} 
                            setDraggedTask={setDraggedTask} 
                            onClick={() => onEditTask(task)}
                        />
                    ))
                ) : (
                    <div className={`empty-column-state ${isDragOver ? 'drop-target' : ''}`}>
                        Arraste tarefas para cá
                    </div>
                )}
            </div>
        </div>
    );
};

export default KanbanColumn;