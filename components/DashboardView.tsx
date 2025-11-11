import React, { useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { useDashboardData } from '../hooks/useDashboardData';
import Header from './Header';
import KanbanBoard from './KanbanBoard';
import FloatingActionButton from './FloatingActionButton';
import AddTaskModal from './AddTaskModal';
import ConfirmationModal from './ConfirmationModal';
import { Task, TaskFormData } from '../types';
import { showToast } from '../App';

interface DashboardViewProps {
    session: Session;
}

const DashboardView: React.FC<DashboardViewProps> = ({ session }) => {
    const { columns, setDraggedTask, moveTask, addTask, updateTask, deleteTask } = useDashboardData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

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

    return (
        <div className="dashboard-container">
            <Header session={session} />
            <KanbanBoard 
                columns={columns}
                setDraggedTask={setDraggedTask}
                moveTask={moveTask}
                onEditTask={handleOpenEditTaskModal}
            />
            <FloatingActionButton onClick={handleOpenAddTaskModal} />
            <AddTaskModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveTask}
                onConfirmDelete={handleConfirmDelete}
                taskToEdit={editingTask}
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