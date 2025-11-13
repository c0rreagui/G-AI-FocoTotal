import React from 'react';
import { Columns, Task, Context } from '../types';
import TaskCard from './TaskCard';
// FIX: Imported KANBAN_COLUMNS to provide a reliable way to iterate over columns,
// avoiding potential type inference issues with `Object.values` on complex mapped types.
import { CONTEXTS, KANBAN_COLUMNS } from '../constants';

interface ContextViewProps {
    columns: Columns;
    onEditRequest: (task: Task, trigger: HTMLElement) => void;
    onDeleteRequest: (task: Task) => void;
    onTaskPointerDown: (e: React.PointerEvent<HTMLDivElement>, task: Task) => void;
    onTaskKeyDown: (e: React.KeyboardEvent<HTMLDivElement>, task: Task) => void;
    draggingTaskId: string | null;
    keyboardDraggingTaskId: string | null;
    deletingTaskId: string | null;
    activeFilter: Context | null;
    searchQuery: string;
}

const ContextView: React.FC<ContextViewProps> = (props) => {
    const { 
        columns, 
        onEditRequest, 
        onDeleteRequest, 
        onTaskPointerDown, 
        onTaskKeyDown,
        draggingTaskId,
        keyboardDraggingTaskId,
        deletingTaskId,
        activeFilter,
        searchQuery,
    } = props;

    const allTasks = React.useMemo(() => 
        // FIX: Replaced `Object.values(columns)` with an iteration over KANBAN_COLUMNS
        // to prevent `col` from being inferred as `unknown`, which would cause `col.tasks` to fail.
        KANBAN_COLUMNS.flatMap(colId => columns[colId].tasks), 
    [columns]);

    const filteredTasks = React.useMemo(() =>
        activeFilter ? allTasks.filter(task => task.context === activeFilter) : allTasks,
    [allTasks, activeFilter]);

    const tasksByContext = React.useMemo(() => {
        const grouped: { [key in Context]?: Task[] } = {};
        // Use a consistent default context if a task somehow lacks one
        const defaultContext: Context = 'Pessoal';

        filteredTasks.forEach(task => {
            const context = task.context || defaultContext;
            if (!grouped[context]) {
                grouped[context] = [];
            }
            grouped[context]!.push(task);
        });
        
        // Sort tasks within each group by their established order
        for (const context in grouped) {
            grouped[context as Context]!.sort((a, b) => a.order - b.order);
        }
        return grouped;
    }, [filteredTasks]);

    const orderedContexts = Object.keys(CONTEXTS) as Context[];

    return (
        <main className="context-view">
            {orderedContexts.map(context => {
                const tasks = tasksByContext[context];
                if (!tasks || tasks.length === 0) return null;

                return (
                    <section key={context} className="context-group" aria-labelledby={`context-header-${context}`}>
                        <h2 id={`context-header-${context}`} className="context-group-header" style={{'--context-color': CONTEXTS[context].color} as React.CSSProperties}>
                            {CONTEXTS[context].label}
                        </h2>
                        <div className="context-task-list">
                            {tasks.map(task => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    // FIX: Wrapped handlers to provide the `task` argument.
                                    onPointerDown={(e) => onTaskPointerDown(e, task)}
                                    onKeyDown={(e) => onTaskKeyDown(e, task)}
                                    onEditRequest={onEditRequest}
                                    onDeleteRequest={onDeleteRequest}
                                    isDragging={draggingTaskId === task.id}
                                    isKeyboardDragging={keyboardDraggingTaskId === task.id}
                                    isDeleting={deletingTaskId === task.id}
                                    searchQuery={searchQuery}
                                />
                            ))}
                        </div>
                    </section>
                )
            })}
             {filteredTasks.length === 0 && (
                <div className="context-empty-state">
                    <h3>Nenhuma tarefa encontrada</h3>
                    <p>Crie uma nova tarefa ou ajuste seus filtros.</p>
                </div>
            )}
        </main>
    );
};

export default ContextView;