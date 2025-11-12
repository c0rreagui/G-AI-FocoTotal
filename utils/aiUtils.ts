import { Task, Context } from '../types';

/**
 * Sugere uma data de entrega para uma nova tarefa.
 * A lógica encontra o dia com menos tarefas nos próximos 14 dias.
 */
export const suggestDueDate = (allTasks: Task[]): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const taskCountByDay: { [key: string]: number } = {};
    allTasks.forEach(task => {
        if (task.dueDate) {
            taskCountByDay[task.dueDate] = (taskCountByDay[task.dueDate] || 0) + 1;
        }
    });

    let bestDate = new Date(today);
    let minTasks = Infinity;

    for (let i = 1; i < 14; i++) { // Começa de amanhã
        const currentDate = new Date(today);
        currentDate.setDate(today.getDate() + i);
        const dateString = currentDate.toISOString().split('T')[0];
        
        const taskCount = taskCountByDay[dateString] || 0;

        if (taskCount < minTasks) {
            minTasks = taskCount;
            bestDate = currentDate;
        }
    }

    return bestDate.toISOString().split('T')[0];
};

/**
 * Otimiza o cronograma para os próximos 7 dias.
 * Move tarefas de dias sobrecarregados para dias mais livres.
 */
export const optimizeSchedule = (allTasks: Task[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 7);

    const tasksThisWeek = allTasks.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate >= today && dueDate <= sevenDaysLater && task.columnId !== 'Concluído';
    });

    // Guard clause: Não otimizar se houver poucas tarefas.
    if (tasksThisWeek.length < 3) {
        return {
            suggestions: [],
            summary: "Não há tarefas suficientes na próxima semana para uma otimização significativa."
        };
    }

    const tasksByDay: Map<string, Task[]> = new Map();
    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        tasksByDay.set(d.toISOString().split('T')[0], []);
    }
    
    tasksThisWeek.forEach(task => {
        if(tasksByDay.has(task.dueDate!)) {
            tasksByDay.get(task.dueDate!)!.push(task);
        }
    });

    const avgTasks = tasksThisWeek.length / 7;
    const overloadedThreshold = Math.ceil(avgTasks) + 1;

    const overloadedDays = Array.from(tasksByDay.entries()).filter(([, tasks]) => tasks.length > overloadedThreshold);
    const underloadedDays = Array.from(tasksByDay.entries()).filter(([, tasks]) => tasks.length < avgTasks);
    
    const suggestions: (Partial<Task> & {id: string})[] = [];
    let movedCount = 0;

    for (const [overloadedDate, tasks] of overloadedDays) {
        if (underloadedDays.length > 0) {
            const taskToMove = tasks.find(t => t.context !== 'Marco'); // Não mover marcos
            if (taskToMove) {
                const [targetDate] = underloadedDays[0];
                suggestions.push({ id: taskToMove.id, dueDate: targetDate });
                
                // Simula a movimentação para os próximos cálculos
                tasksByDay.get(overloadedDate)!.splice(tasksByDay.get(overloadedDate)!.indexOf(taskToMove), 1);
                tasksByDay.get(targetDate)!.push({ ...taskToMove, dueDate: targetDate });

                if (tasksByDay.get(targetDate)!.length >= avgTasks) {
                    underloadedDays.shift();
                }
                movedCount++;
            }
        }
    }
    
    const summary = movedCount > 0 
        ? `Sugestão: ${movedCount} tarefa(s) foram reagendadas para equilibrar sua semana.`
        : "Seu cronograma para a semana já parece equilibrado!";

    return { suggestions, summary };
};

/**
 * Gera um resumo em texto para as tarefas da próxima semana.
 */
export const summarizePeriod = (allTasks: Task[]): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 7);

     const tasksThisWeek = allTasks.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate >= today && dueDate <= sevenDaysLater;
    });

    if (tasksThisWeek.length === 0) {
        return "Você não tem tarefas com prazo para os próximos 7 dias. Hora de relaxar ou planejar!";
    }

    const contextCounts: Record<string, number> = {};
    tasksThisWeek.forEach(task => {
        if (task.context) {
            contextCounts[task.context] = (contextCounts[task.context] || 0) + 1;
        }
    });

    const dominantContext = Object.keys(contextCounts).reduce((a, b) => contextCounts[a] > contextCounts[b] ? a : b, '');

    const importantTask = tasksThisWeek.find(t => t.context === 'Marco') 
        || tasksThisWeek.find(t => new Date(t.dueDate!).getTime() === today.getTime() + 86400000); // Tarefa para amanhã

    let summary = `Resumo dos próximos 7 dias: Você tem ${tasksThisWeek.length} tarefa(s).`;
    if (dominantContext) {
        summary += ` Seu foco principal parece ser em '${dominantContext}'.`;
    }
    if (importantTask) {
        summary += ` Fique de olho em "${importantTask.title}"!`;
    }

    return summary;
};