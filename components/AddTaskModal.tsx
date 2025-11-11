import React, { useState, useEffect } from 'react';
import { Task, TaskFormData } from '../types';
import { KANBAN_COLUMNS, CONTEXTS } from '../constants';
import { showToast } from '../App';

interface AddTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (taskData: TaskFormData | Task) => void;
    onConfirmDelete: (task: Task) => void;
    taskToEdit?: Task | null;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onSave, onConfirmDelete, taskToEdit }) => {
    const initialFormState: TaskFormData = {
        title: '',
        description: '',
        dueDate: '',
        context: 'Pessoal',
        columnId: 'A Fazer',
    };

    const [formData, setFormData] = useState<TaskFormData>(initialFormState);

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
                setFormData(initialFormState);
            }
        }
    }, [taskToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim()) {
            showToast('O título da tarefa é obrigatório.');
            return;
        }
        if (formData.dueDate && new Date(formData.dueDate) < new Date(new Date().toDateString())) {
            showToast('A data de entrega não pode ser no passado.');
            return;
        }

        if (taskToEdit) {
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

    if (!isOpen) return null;

    return (
        <div className="modal-overlay show" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="modal-header">
                        <h2>{taskToEdit ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
                        <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar modal">&times;</button>
                    </div>
                    <div className="modal-body">
                        <div className="form-group">
                            <label htmlFor="title">Título</label>
                            <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="description">Descrição</label>
                            <textarea id="description" name="description" value={formData.description} onChange={handleChange}></textarea>
                        </div>
                         <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="dueDate">Data de Entrega</label>
                                <input type="date" id="dueDate" name="dueDate" value={formData.dueDate} onChange={handleChange} />
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
                    </div>
                    <div className="modal-footer">
                        {taskToEdit && (
                             <button type="button" className="btn btn-danger-outline" onClick={handleDeleteClick}>Excluir</button>
                        )}
                        <button type="submit" className="btn btn-primary">{taskToEdit ? 'Salvar Alterações' : 'Criar Tarefa'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddTaskModal;