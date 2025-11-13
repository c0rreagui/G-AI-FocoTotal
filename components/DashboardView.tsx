
import React, { useState, useRef, useCallback, useMemo } from 'react';
// FIX: Use `import type` for Session type to avoid module resolution issues.
import type { Session } from '@supabase/supabase-js';
import { useDashboardData } from '../hooks/useDashboardData';
import { useKanbanDnD } from '../hooks/useKanbanDnD';
import { supabase } from '../services/supabaseService';
import { Task, TaskFormData, Context, ColumnId, DashboardViewMode, Column } from '../types';
import { DEV_EMAIL } from '../constants';
import Header from './Header';
import KanbanBoard from './KanbanBoard';
import TimelineView from './TimelineView';
import ContextView from './ContextView'; // Importar a nova view
import FloatingActionButton from './FloatingActionButton';
import AddTaskModal from './AddTaskModal';
import ConfirmationModal from './ConfirmationModal';
import DevToolsModal from './DevToolsModal';
import FilterButtons from './FilterButtons';
import TimelineControls from './TimelineControls';

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
    const [initialDateForNewTask, setInitialDateForNewTask] = useState<string | undefined>();
    const [viewMode, setViewMode] = useState<DashboardViewMode>('contexto'); // Definir 'contexto' como padrão
    const [searchQuery, setSearchQuery] = useState('');

    const fabRef = useRef<HTMLButtonElement>(null);
    const lastFocusedElement = useRef<HTMLElement | null>(null);
    
    const allTasks = useMemo(() => (Object.values(columns) as Column[]).flatMap(col => col.tasks), [columns]);
    
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

    const handleOpenModalForColumn = useCallback((columnId: ColumnId, date?: string) => {
        setTaskToEdit(null);
        setInitialColumnForNewTask(columnId);
        setInitialDateForNewTask(date);
        setIsModalOpen(true);
    }, []);

    const handleOpenModal = () => {
        handleOpenModalForColumn('A Fazer');
        lastFocusedElement.current = fabRef.current;
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setTaskToEdit(null);
        setInitialDateForNewTask(undefined);
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
        // FIX: The `signOut` method is correct for the v2 API. The error was likely a cascade.
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
        <div className="app-main-content">
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

            <div className="app-view-content">
                {viewMode === 'kanban' && (
                    <>
                        <FilterButtons activeFilter={activeFilter} onFilterChange={setActiveFilter} />
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
                            searchQuery={searchQuery}
                        />
                    </>
                )}
                
                {viewMode === 'timeline' && (
                    <TimelineView 
                        tasks={allTasks} 
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        onEditRequest={handleEditRequest}
                        onDateDoubleClick={(date) => handleOpenModalForColumn('A Fazer', date)}
                        onUpdateTask={updateTask}
                    />
                )}

                {viewMode === 'contexto' && (
                     <>
                        <FilterButtons activeFilter={activeFilter} onFilterChange={setActiveFilter} />
                        <ContextView
                            columns={columns}
                            onEditRequest={handleEditRequest}
                            onDeleteRequest={handleDeleteRequest}
                            onTaskPointerDown={handleTaskPointerDown}
                            onTaskKeyDown={handleTaskKeyDown}
                            draggingTaskId={draggingTaskId}
                            keyboardDraggingTaskId={keyboardDraggingTaskId}
                            deletingTaskId={deletingTaskId}
                            activeFilter={activeFilter}
                            searchQuery={searchQuery}
                        />
                    </>
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
                allTasks={allTasks}
                initialDate={initialDateForNewTask}
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
