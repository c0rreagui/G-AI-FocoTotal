import React, { useState, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { useDashboardData } from '../hooks/useDashboardData';
import { useKanbanDnD } from '../hooks/useKanbanDnD';
import { supabase } from '../services/supabaseService';
import { Task, TaskFormData } from '../types';
import { DEV_EMAIL } from '../constants';
import Header from './Header';
import KanbanBoard from './KanbanBoard';
import FloatingActionButton from './FloatingActionButton';
import AddTaskModal from './AddTaskModal';
import ConfirmationModal from './ConfirmationModal';
import DevToolsModal from './DevToolsModal'; // Importa o novo modal

interface DashboardViewProps {
    session: Session;
}

const DashboardView: React.FC<DashboardViewProps> = ({ session }) => {
    const { 
        columns, 
        isLoading, 
        deletingTaskId,
        syncStatus,
        realtimeEvents,
        addTask, 
        updateTask, 
        deleteTask, 
        moveTask,
        addTestTasks,
        deleteAllTasks,
        forceSync
    } = useDashboardData(session);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
    const [isDevToolsOpen, setIsDevToolsOpen] = useState(false); // Controla o novo modal de DevTools
    
    // Estado para o modal de confirmação das DevTools
    const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);


    const fabRef = useRef<HTMLButtonElement>(null);
    const lastFocusedElement = useRef<HTMLElement | null>(null);
    
    const handleEditTask = (task: Task, triggerElement: HTMLElement) => {
        setTaskToEdit(task);
        lastFocusedElement.current = triggerElement;
        setIsModalOpen(true);
    };

    const { 
        draggingTaskId, 
        keyboardDraggingTaskId, 
        announcement,
        handleTaskPointerDown, 
        handleTaskKeyDown 
    } = useKanbanDnD({ columns, moveTask, onEditTask: handleEditTask });

    const handleOpenModal = () => {
        setTaskToEdit(null);
        lastFocusedElement.current = fabRef.current;
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setTaskToEdit(null);
        if (lastFocusedElement.current) {
            lastFocusedElement.current.focus();
        }
    };

    const handleSaveTask = (taskData: TaskFormData | Task) => {
        if ('id' in taskData) {
            updateTask(taskData as Task);
        } else {
            addTask(taskData as TaskFormData);
        }
    };

    const handleConfirmDelete = (task: Task) => {
        setTaskToDelete(task);
        setIsModalOpen(false); // Close edit modal before opening confirm modal
    };

    const handleExecuteDelete = () => {
        if (taskToDelete) {
            deleteTask(taskToDelete);
            setTaskToDelete(null);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };
    
    const handleDeleteAllRequest = () => {
        setIsDeleteAllConfirmOpen(true);
    }
    
    const handleExecuteDeleteAll = async () => {
        await deleteAllTasks();
        setIsDeleteAllConfirmOpen(false);
    }

    const isDevUser = session.user.email === DEV_EMAIL;

    return (
        <div className="dashboard-layout">
            <div role="alert" aria-live="assertive" className="sr-only">
                {announcement}
            </div>

            <Header 
                session={session} 
                columns={columns} 
                onLogoutRequest={handleLogout} 
                syncStatus={syncStatus}
                isDevUser={isDevUser}
                onDevToolsClick={() => setIsDevToolsOpen(true)} // Abre o modal de DevTools
            />

            <KanbanBoard 
                columns={columns}
                onTaskPointerDown={handleTaskPointerDown}
                onTaskKeyDown={handleTaskKeyDown}
                draggingTaskId={draggingTaskId}
                keyboardDraggingTaskId={keyboardDraggingTaskId}
                isLoading={isLoading}
                deletingTaskId={deletingTaskId}
            />
            
            <FloatingActionButton onClick={handleOpenModal} ref={fabRef} />

            <AddTaskModal 
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveTask}
                onConfirmDelete={handleConfirmDelete}
                taskToEdit={taskToEdit}
                triggerElement={lastFocusedElement.current}
            />

            <ConfirmationModal 
                isOpen={!!taskToDelete}
                onClose={() => setTaskToDelete(null)}
                onConfirm={handleExecuteDelete}
                title="Confirmar Exclusão"
                message={`Tem certeza de que deseja excluir a tarefa "${taskToDelete?.title}"? Esta ação não pode ser desfeita.`}
            />
            
            {/* Modal de confirmação para as DevTools */}
            <ConfirmationModal 
                isOpen={isDeleteAllConfirmOpen}
                onClose={() => setIsDeleteAllConfirmOpen(false)}
                onConfirm={handleExecuteDeleteAll}
                title="Confirmar Limpeza Total"
                message={`Você tem certeza que quer excluir TODAS as tarefas? Essa ação é irreversível.`}
            />


            {/* Renderiza o novo DevToolsModal */}
            {isDevUser && (
                 <DevToolsModal 
                    isOpen={isDevToolsOpen}
                    onClose={() => setIsDevToolsOpen(false)}
                    session={session}
                    columns={columns}
                    syncStatus={syncStatus}
                    realtimeEvents={realtimeEvents}
                    onForceSync={forceSync}
                    onAddTestTasks={addTestTasks}
                    onDeleteAllTasks={handleDeleteAllRequest}
                 />
            )}
        </div>
    );
};

export default DashboardView;