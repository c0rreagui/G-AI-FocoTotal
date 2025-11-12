import React, { useState, useEffect, useRef } from 'react';
import { Task, TaskFormData, ColumnId, Subtask } from '../types';
import { KANBAN_COLUMNS, CONTEXTS } from '../constants';
import { useToast } from '../contexts/ToastContext';
import { useModalFocus } from '../hooks/useModalFocus';

interface AddTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (taskData: TaskFormData | Task) => void;
    onConfirmDelete: (task: Task) => void;
    taskToEdit?: Task | null;
    triggerElement: HTMLElement | null;
    initialColumnId: ColumnId;
    onAddSubtask: (taskId: string, title: string) => void;
    onUpdateSubtask: (subtask: Partial<Subtask> & { id: string }) => void;
    onDeleteSubtask: (subtaskId: string) => void;
}

const AddTaskModal: React.FC<AddTaskModalProps> = (props) => {
    const { 
        isOpen, onClose, onSave, onConfirmDelete, taskToEdit, triggerElement, initialColumnId,
        onAddSubtask, onUpdateSubtask, onDeleteSubtask
    } = props;
    
    const { showToast } = useToast();
    const initialFormState: TaskFormData = {
        title: '',
        description: '',
        dueDate: '',
        context: 'Pessoal',
        columnId: 'A Fazer',
    };
    const [formData, setFormData] = useState<TaskFormData>(initialFormState);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);
    const firstInputRef = useRef<HTMLInputElement>(null);
    const titleId = 'task-modal-title';

    useModalFocus(isOpen, modalRef, firstInputRef, onClose, triggerElement);

    useEffect(() => {
        if (isOpen) {
            if (taskToEdit) {
                setFormData({
                    title: taskToEdit.title,
                    description: taskToEdit.description || '',
                    dueDate: taskToEdit.dueDate || '',
                    context: taskToEdit.context || 'Pessoal',
                    columnId: taskToEdit.columnId,
                });
            } else {
                setFormData({
                    ...initialFormState,
                    columnId: initialColumnId,
                });
            }
        }
    }, [taskToEdit, isOpen, initialColumnId]);
    
    const getTodayString = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim()) {
            showToast('O título da tarefa é obrigatório.', 'error');
            return;
        }

        if (taskToEdit) {
            // Apenas salva a tarefa principal. As sub-tarefas são salvas em tempo real.
            onSave({ ...taskToEdit, ...formData });
        } else {
            onSave(formData);
        }
        onClose();
    };

    const handleDeleteClick = () => {
        if (taskToEdit) {
            onConfirmDelete(taskToEdit);
        }
    };
    
    const handleAddSubtask = (e: React.FormEvent) => {
        e.preventDefault();
        if (taskToEdit && newSubtaskTitle.trim()) {
            onAddSubtask(taskToEdit.id, newSubtaskTitle.trim());
            setNewSubtaskTitle('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay show" onMouseDown={onClose}>
            <div 
                className="modal-content" 
                onMouseDown={(e) => e.stopPropagation()} 
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
            >
                <form onSubmit={handleSubmit}>
                    <div className="modal-header">
                        <h2 id={titleId}>{taskToEdit ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
                        <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar modal">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                    <div className="modal-body">
                        <div className="form-group">
                            <label htmlFor="title">Título</label>
                            <input ref={firstInputRef} type="text" id="title" name="title" value={formData.title} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="description">Descrição</label>
                            <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={3}></textarea>
                        </div>
                         <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="dueDate">Data de Entrega</label>
                                <input type="date" id="dueDate" name="dueDate" value={formData.dueDate} onChange={handleChange} min={getTodayString()} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="context">Contexto</label>
                                <select id="context" name="context" value={formData.context} onChange={handleChange}>
                                    {Object.entries(CONTEXTS).map(([key, { label }]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>
                         </div>
                        <div className="form-group">
                            <label htmlFor="columnId">Status</label>
                            <select id="columnId" name="columnId" value={formData.columnId} onChange={handleChange}>
                                {KANBAN_COLUMNS.map(col => <option key={col} value={col}>{col}</option>)}
                            </select>
                        </div>

                        {taskToEdit && (
                            <div className="subtask-section">
                                <label>Sub-tarefas</label>
                                <div className="subtask-list">
                                    {taskToEdit.subtasks?.map(subtask => (
                                        <div key={subtask.id} className="subtask-item">
                                            <input 
                                                type="checkbox" 
                                                checked={subtask.isCompleted}
                                                onChange={() => onUpdateSubtask({ id: subtask.id, isCompleted: !subtask.isCompleted })}
                                                aria-label={subtask.title}
                                            />
                                            <input 
                                                type="text"
                                                defaultValue={subtask.title}
                                                onBlur={(e) => {
                                                    if (e.target.value !== subtask.title) {
                                                        onUpdateSubtask({ id: subtask.id, title: e.target.value })
                                                    }
                                                }}
                                                className="subtask-title-input"
                                            />
                                            <button type="button" className="icon-btn subtask-delete-btn" onClick={() => onDeleteSubtask(subtask.id)} aria-label="Excluir sub-tarefa">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <form className="add-subtask-form" onSubmit={handleAddSubtask}>
                                    <input 
                                        type="text" 
                                        placeholder="Adicionar nova sub-tarefa..." 
                                        value={newSubtaskTitle}
                                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                    />
                                    <button type="submit" className="btn btn-secondary">Adicionar</button>
                                </form>
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        {taskToEdit && (
                             <button type="button" className="btn btn-danger-outline" onClick={handleDeleteClick}>Excluir Tarefa</button>
                        )}
                        <button type="submit" className="btn btn-primary">{taskToEdit ? 'Salvar Alterações' : 'Criar Tarefa'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddTaskModal;