import React, { useState, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { useDashboardData } from '../hooks/useDashboardData';
import { useKanbanDnD } from '../hooks/useKanbanDnD';
import Header from './Header';
import KanbanBoard from './KanbanBoard';
import FloatingActionButton from './FloatingActionButton';
import AddTaskModal from './AddTaskModal';
import ConfirmationModal from './ConfirmationModal';
import { Task, TaskFormData } from '../types';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../services/supabaseService';

interface DashboardViewProps {
    session: Session;
}

const DashboardView: React.FC<DashboardViewProps> = ({ session }) => {
    const { showToast } = useToast();
    const { columns, loading, syncStatus, moveTask, addTask, updateTask, deleteTask } = useDashboardData(session.user, showToast);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
    const fabRef = useRef<HTMLButtonElement | null>(null);
    const [modalTriggerElement, setModalTriggerElement] = useState<HTMLElement | null>(null);

    const handleOpenEditTaskModal = (task: Task, triggerElement: HTMLElement) => {
        if (keyboardDraggingTaskId) return;
        setEditingTask(task);
        setModalTriggerElement(triggerElement);
        setIsModalOpen(true);
    };

    const { 
        draggingTaskId, 
        keyboardDraggingTaskId, 
        announcement, 
        handleTaskPointerDown, 
        handleTaskKeyDown 
    } = useKanbanDnD({ moveTask, columns, onEditTask: handleOpenEditTaskModal });
    
    const handleOpenAddTaskModal = () => {
        setEditingTask(null);
        setModalTriggerElement(fabRef.current);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTask(null);
    };
    
    const handleSaveTask = async (taskData: TaskFormData | Task) => {
        try {
            if ('id' in taskData && editingTask) {
                await updateTask(taskData as Task, editingTask.columnId);
                showToast('Tarefa atualizada com sucesso!', 'success');
            } else {
                await addTask(taskData as TaskFormData);
                showToast('Tarefa criada com sucesso!', 'success');
            }
        } catch (error: any) {
             showToast(`Erro ao salvar tarefa: ${error.message}`, 'error');
        }
    };
    
    const handleConfirmDelete = (task: Task) => {
        setIsModalOpen(false);
        setTaskToDelete(task);
    };

    const handleDeleteTask = async () => {
        if(taskToDelete) {
            try {
                setDeletingTaskId(taskToDelete.id);
                // A sincronização agora acontece no useDashboardData após a exclusão bem-sucedida
                // A animação de 300ms no CSS + a lógica de remoção otimista garantem a fluidez
                await deleteTask(taskToDelete.id, taskToDelete.columnId);
                showToast(`Tarefa "${taskToDelete.title}" foi excluída.`, 'success');
            } catch (error: any) {
                // O toast de erro já é tratado no hook
            } finally {
                setTaskToDelete(null);
                // A remoção do ID de exclusão pode ser mais rápida
                setTimeout(() => setDeletingTaskId(null), 300);
            }
        }
    };

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            showToast(`Erro ao sair: ${error.message}`, 'error');
        }
        setIsLogoutModalOpen(false);
    };
    
    return (
        <div className="dashboard-container">
            <Header 
                session={session} 
                columns={columns} 
                onLogoutRequest={() => setIsLogoutModalOpen(true)}
                syncStatus={syncStatus}
            />
            <KanbanBoard 
                columns={columns}
                onTaskPointerDown={handleTaskPointerDown}
                onTaskKeyDown={handleTaskKeyDown}
                draggingTaskId={draggingTaskId}
                keyboardDraggingTaskId={keyboardDraggingTaskId}
                isLoading={loading}
                deletingTaskId={deletingTaskId}
            />
            <FloatingActionButton ref={fabRef} onClick={handleOpenAddTaskModal} />
            <div className="sr-only" role="status" aria-live="assertive">{announcement}</div>
            <AddTaskModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveTask}
                onConfirmDelete={handleConfirmDelete}
                taskToEdit={editingTask}
                triggerElement={modalTriggerElement}
            />
            <ConfirmationModal
                isOpen={!!taskToDelete}
                onClose={() => setTaskToDelete(null)}
                onConfirm={handleDeleteTask}
                title="Confirmar Exclusão"
                message={`Tem certeza que deseja excluir a tarefa "${taskToDelete?.title}"? Esta ação não pode ser desfeita.`}
            />
             <ConfirmationModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={handleLogout}
                title="Confirmar Saída"
                message="Tem certeza que deseja sair da sua conta?"
                confirmText="Sair"
            />
        </div>
    );
};

export default DashboardView;
