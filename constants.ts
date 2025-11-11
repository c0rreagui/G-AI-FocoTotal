import { ColumnId, Task, Columns } from './types';

export const KANBAN_COLUMNS: ColumnId[] = ['A Fazer', 'Em Progresso', 'Concluído'];

export const CONTEXTS = {
    Trabalho: { label: 'Trabalho', color: 'var(--context-trabalho)' },
    Pessoal: { label: 'Pessoal', color: 'var(--context-pessoal)' },
    Faculdade: { label: 'Faculdade', color: 'var(--context-faculdade)' },
    Freela: { label: 'Freela', color: 'var(--context-freela)' },
};

export const INITIAL_TASKS: Task[] = [
    { id: 'task-1', title: 'Configurar o ambiente de desenvolvimento', columnId: 'Concluído', owner: 'dev' },
    { id: 'task-2', title: 'Desenvolver a tela de login', description: 'Implementar login com Supabase.', columnId: 'Concluído', owner: 'dev' },
    { id: 'task-3', title: 'Criar a estrutura do Dashboard', description: 'Definir layout principal, header e board.', columnId: 'Em Progresso', owner: 'dev' },
    { id: 'task-4', title: 'Implementar o Drag and Drop das tarefas', dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], context: 'Trabalho', columnId: 'Em Progresso', owner: 'dev' },
    { id: 'task-5', title: 'Adicionar modal para criar novas tarefas', columnId: 'A Fazer', owner: 'dev' },
    { id: 'task-6', title: 'Estudar para a prova de cálculo', dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], context: 'Faculdade', columnId: 'A Fazer', owner: 'dev' },
    { id: 'task-7', title: 'Reunião de alinhamento com o cliente', context: 'Freela', columnId: 'A Fazer', owner: 'dev' },
];

export const buildInitialColumns = (tasks: Task[]): Columns => {
    const columns: Columns = {
        'A Fazer': { id: 'A Fazer', title: 'A Fazer', tasks: [] },
        'Em Progresso': { id: 'Em Progresso', title: 'Em Progresso', tasks: [] },
        'Concluído': { id: 'Concluído', title: 'Concluído', tasks: [] },
    };

    tasks.forEach(task => {
        if (columns[task.columnId]) {
            columns[task.columnId].tasks.push(task);
        }
    });

    return columns;
};