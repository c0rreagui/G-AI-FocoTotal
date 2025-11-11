import { ColumnId, Task, Columns } from './types';

export const KANBAN_COLUMNS: ColumnId[] = ['A Fazer', 'Em Progresso', 'Concluído'];

export const CONTEXTS = {
    Trabalho: { label: 'Trabalho', color: 'var(--context-trabalho)' },
    Pessoal: { label: 'Pessoal', color: 'var(--context-pessoal)' },
    Faculdade: { label: 'Faculdade', color: 'var(--context-faculdade)' },
    Freela: { label: 'Freela', color: 'var(--context-freela)' },
};

export const buildInitialColumns = (tasks: Task[]): Columns => {
    const columns: Columns = {
        'A Fazer': { id: 'A Fazer', title: 'A Fazer', tasks: [] },
        'Em Progresso': { id: 'Em Progresso', title: 'Em Progresso', tasks: [] },
        'Concluído': { id: 'Concluído', title: 'Concluído', tasks: [] },
    };

    // Ordena as tarefas antes de distribuí-las
    const sortedTasks = [...tasks].sort((a, b) => a.order - b.order);

    sortedTasks.forEach(task => {
        if (columns[task.columnId]) {
            columns[task.columnId].tasks.push(task);
        }
    });

    return columns;
};