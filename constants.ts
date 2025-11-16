

import { ColumnId, Task, Columns } from './types';

// --- APP ---
// FIX: Corrigido o nome das propriedades do conector da Timeline 3D para `midA` e `midB`.
// build: Incremented app version.
export const APP_VERSION = 'v3.0.53';

// --- KANBAN ---
export const KANBAN_COLUMNS: ColumnId[] = ['A Fazer', 'Em Progresso', 'Concluído'];

export const CONTEXTS: Record<string, { label: string, color: string }> = {
    Trabalho: { label: 'Trabalho', color: 'var(--context-trabalho)' },
    Pessoal: { label: 'Pessoal', color: 'var(--context-pessoal)' },
    Faculdade: { label: 'Faculdade', color: 'var(--context-faculdade)' },
    Freela: { label: 'Freela', color: 'var(--context-freela)' },
    Marco: { label: 'Marco', color: 'var(--context-marco)' },
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

// --- AUTH & DEV ---
export const DEV_EMAIL = process.env.DEV_EMAIL || 'dev@focototal.com';
export const DEV_PASSWORD = process.env.DEV_PASSWORD || 'password';
export const DEV_PIN = '2609';

export const GUEST_EMAIL = process.env.GUEST_EMAIL || 'guest@focototal.com';
export const GUEST_PASSWORD = process.env.GUEST_PASSWORD || 'guestpassword';