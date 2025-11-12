import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Session } from '@supabase/supabase-js';
import { useDashboardData } from '../hooks/useDashboardData';
import { useKanbanDnD } from '../hooks/useKanbanDnD';
import { supabase } from '../services/supabaseService';
// FIX: Imported the 'Column' type to be used for explicit casting.
import { Task, TaskFormData, Context, ColumnId, Subtask, DashboardViewMode, Column } from '../types';
import { DEV_EMAIL } from '../constants';
import Header from './Header';
import KanbanBoard from './KanbanBoard';
import TimelineView from './TimelineView';
import FloatingActionButton from './FloatingActionButton';
import AddTaskModal from './AddTaskModal';
import ConfirmationModal from './ConfirmationModal';
import DevToolsModal from './DevToolsModal';
import FilterButtons from './FilterButtons';

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
        isStale,
        addTask, 
        updateTask, 
        deleteTask, 
        moveTask,
        addSubtask,
        updateSubtask,
        deleteSubtask,
        addTestTasks,
        deleteAllTasks,
        forceSync
    } = useDashboardData(session);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
    const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
    const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState<Context | null>(null);
    const [initialColumnForNewTask, setInitialColumnForNewTask] = useState<ColumnId>('A Fazer');
    const [viewMode, setViewMode] = useState<DashboardViewMode>('kanban');

    const fabRef = useRef<HTMLButtonElement>(null);
    const lastFocusedElement = useRef<HTMLElement | null>(null);
    
    const handleEditRequest = useCallback((task: Task, triggerElement: HTMLElement) => {
        setTaskToEdit(task);
        lastFocusedElement.current = triggerElement;
        setIsModalOpen(true);
    }, []);
    
    const handleDeleteRequest = useCallback((task: Task) => {
        setTaskToDelete(task);
    }, []);

    const { 
        draggingTaskId, 
        keyboardDraggingTaskId, 
        announcement,
        handleTaskPointerDown, 
        handleTaskKeyDown 
    } = useKanbanDnD({ columns, moveTask, onEditTask: handleEditRequest });

    const handleOpenModalForColumn = useCallback((columnId: ColumnId) => {
        setTaskToEdit(null);
        setInitialColumnForNewTask(columnId);
        setIsModalOpen(true);
        // lastFocusedElement.current could be set here if the trigger element was passed up
    }, []);

    const handleOpenModal = () => {
        handleOpenModalForColumn('A Fazer');
        lastFocusedElement.current = fabRef.current;
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setTaskToEdit(null);
        // O foco já é gerenciado pelo hook useModalFocus
    };

    const handleSaveTask = (taskData: TaskFormData | Task) => {
        if ('id' in taskData) {
            updateTask(taskData as Task);
        } else {
            addTask(taskData as TaskFormData);
        }
    };

    const handleConfirmDeleteFromModal = (task: Task) => {
        setIsModalOpen(false); // Fecha o modal de edição
        setTaskToDelete(task);
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

    // FIX: Cast Object.values(columns) to Column[] to fix type inference issue where `col.tasks` was not found.
    const allTasks = useMemo(() => (Object.values(columns) as Column[]).flatMap(col => col.tasks), [columns]);

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
                onDevToolsClick={() => setIsDevToolsOpen(true)}
                isSyncing={isLoading}
                onRefreshRequest={forceSync}
                isStale={isStale}
                viewMode={viewMode}
                onViewChange={setViewMode}
            />

            <div className="dashboard-content">
                <FilterButtons 
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                />
                {viewMode === 'kanban' ? (
                     <KanbanBoard 
                        columns={columns}
                        onTaskPointerDown={handleTaskPointerDown}
                        onTaskKeyDown={handleTaskKeyDown}
                        onEditRequest={handleEditRequest}
                        onDeleteRequest={handleDeleteRequest}
                        onAddTaskRequest={handleOpenModalForColumn}
                        draggingTaskId={draggingTaskId}
                        keyboardDraggingTaskId={keyboardDraggingTaskId}
                        isLoading={isLoading}
                        deletingTaskId={deletingTaskId}
                        activeFilter={activeFilter}
                    />
                ) : (
                    <TimelineView tasks={allTasks} />
                )}
            </div>
            
            <FloatingActionButton onClick={handleOpenModal} ref={fabRef} />

            <AddTaskModal 
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveTask}
                onConfirmDelete={handleConfirmDeleteFromModal}
                taskToEdit={taskToEdit}
                initialColumnId={initialColumnForNewTask}
                triggerElement={lastFocusedElement.current}
                onAddSubtask={addSubtask}
                onUpdateSubtask={updateSubtask}
                onDeleteSubtask={deleteSubtask}
            />

            <ConfirmationModal 
                isOpen={!!taskToDelete}
                onClose={() => setTaskToDelete(null)}
                onConfirm={handleExecuteDelete}
                title="Confirmar Exclusão"
                message={`Tem certeza de que deseja excluir a tarefa "${taskToDelete?.title}"? Esta ação não pode ser desfeita.`}
            />
            
            <ConfirmationModal 
                isOpen={isDeleteAllConfirmOpen}
                onClose={() => setIsDeleteAllConfirmOpen(false)}
                onConfirm={handleExecuteDeleteAll}
                title="Confirmar Limpeza Total"
                message="Você tem certeza que quer excluir TODAS as tarefas? Essa ação é PERMANENTE e não pode ser desfeita."
                confirmText="Sim, excluir tudo"
            />

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