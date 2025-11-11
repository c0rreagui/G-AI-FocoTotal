import React, { useState, useRef, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { useDashboardData } from '../hooks/useDashboardData';
import Header from './Header';
import KanbanBoard from './KanbanBoard';
import FloatingActionButton from './FloatingActionButton';
import AddTaskModal from './AddTaskModal';
import ConfirmationModal from './ConfirmationModal';
import { ColumnId, Task, TaskFormData } from '../types';
import { showToast } from '../App';

interface DashboardViewProps {
    session: Session;
}

const DashboardView: React.FC<DashboardViewProps> = ({ session }) => {
    const { columns, setDraggedTask, moveTask, addTask, updateTask, deleteTask } = useDashboardData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
    
    // --- State para D&D por Toque ---
    const [touchDraggingTask, setTouchDraggingTask] = useState<Task | null>(null);
    const [touchDropTarget, setTouchDropTarget] = useState<ColumnId | null>(null);
    const ghostRef = useRef<HTMLDivElement | null>(null);
    const boardRef = useRef<HTMLDivElement | null>(null);

    const handleOpenAddTaskModal = () => {
        setEditingTask(null);
        setIsModalOpen(true);
    };

    const handleOpenEditTaskModal = (task: Task) => {
        setEditingTask(task);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTask(null);
    };
    
    const handleSaveTask = (taskData: TaskFormData | Task) => {
        if ('id' in taskData) {
            updateTask(taskData);
            showToast('Tarefa atualizada com sucesso!', 'success');
        } else {
            addTask(taskData);
            showToast('Tarefa criada com sucesso!', 'success');
        }
    };
    
    const handleConfirmDelete = (task: Task) => {
        setIsModalOpen(false); // Fecha o modal de edição
        setTaskToDelete(task);
    };

    const handleDeleteTask = () => {
        if(taskToDelete) {
            deleteTask(taskToDelete.id);
            showToast('Tarefa excluída.', 'success');
            setTaskToDelete(null);
        }
    };

    // --- Lógica de D&D por Toque ---
    const handleTaskTouchStart = (e: React.TouchEvent<HTMLButtonElement>, task: Task) => {
        const originalElement = e.currentTarget;
        originalElement.classList.add('dragging');
        setTouchDraggingTask(task);
        setDraggedTask(task); // Para compatibilidade com a lógica existente

        const rect = originalElement.getBoundingClientRect();
        const ghost = document.createElement('div');
        ghost.className = 'task-card-ghost';
        ghost.innerHTML = originalElement.innerHTML;
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;
        ghost.style.top = `${rect.top}px`;
        ghost.style.left = `${rect.left}px`;
        document.body.appendChild(ghost);
        ghostRef.current = ghost;
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!touchDraggingTask || !ghostRef.current) return;
        const touch = e.touches[0];
        ghostRef.current.style.transform = `translate(${touch.clientX - ghostRef.current.offsetLeft - ghostRef.current.offsetWidth / 2}px, ${touch.clientY - ghostRef.current.offsetTop - ghostRef.current.offsetHeight / 2}px)`;

        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        const columnElement = elementBelow?.closest<HTMLDivElement>('.kanban-column');
        if (columnElement) {
            setTouchDropTarget(columnElement.dataset.columnId as ColumnId);
        } else {
            setTouchDropTarget(null);
        }
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!touchDraggingTask || !ghostRef.current) return;
        const touch = e.changedTouches[0];

        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        const columnElement = elementBelow?.closest<HTMLDivElement>('.kanban-column');

        if (columnElement) {
            const targetColumnId = columnElement.dataset.columnId as ColumnId;
            const cards = Array.from(columnElement.querySelectorAll('.task-card:not(.dragging)'));
            let newIndex = cards.length;
            for (let i = 0; i < cards.length; i++) {
                const card = cards[i] as HTMLElement;
                const rect = card.getBoundingClientRect();
                if (touch.clientY < rect.top + rect.height / 2) {
                    newIndex = i;
                    break;
                }
            }
            moveTask(touchDraggingTask.id, targetColumnId, newIndex);
        }

        document.body.removeChild(ghostRef.current);
        ghostRef.current = null;
        const originalEl = boardRef.current?.querySelector(`[data-task-id="${touchDraggingTask.id}"]`);
        originalEl?.classList.remove('dragging');
        setTouchDraggingTask(null);
        setDraggedTask(null);
        setTouchDropTarget(null);
    };

    return (
        <div
            className="dashboard-container"
            ref={boardRef}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <Header session={session} />
            <KanbanBoard 
                columns={columns}
                setDraggedTask={setDraggedTask}
                moveTask={moveTask}
                onEditTask={handleOpenEditTaskModal}
                onTaskTouchStart={handleTaskTouchStart}
                touchDropTarget={touchDropTarget}
            />
            <FloatingActionButton onClick={handleOpenAddTaskModal} />
            <AddTaskModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveTask}
                onConfirmDelete={handleConfirmDelete}
                taskToedit={editingTask}
            />
            <ConfirmationModal
                isOpen={!!taskToDelete}
                onClose={() => setTaskToDelete(null)}
                onConfirm={handleDeleteTask}
                title="Confirmar Exclusão"
                message={`Tem certeza que deseja excluir a tarefa "${taskToDelete?.title}"? Esta ação não pode ser desfeita.`}
            />
        </div>
    );
};

export default DashboardView;