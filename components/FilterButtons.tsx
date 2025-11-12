import React from 'react';
import { Context } from '../types';
import { CONTEXTS } from '../constants';

interface FilterButtonsProps {
    activeFilter: Context | null;
    onFilterChange: (context: Context | null) => void;
}

const ALL_CONTEXTS: { id: Context | null; label: string; color: string }[] = [
    { id: null, label: 'Todos', color: 'var(--primary)' },
    ...Object.entries(CONTEXTS).map(([key, { label, color }]) => ({
        id: key as Context,
        label,
        color,
    })),
];


const FilterButtons: React.FC<FilterButtonsProps> = ({ activeFilter, onFilterChange }) => {
    return (
        <div className="filter-bar" role="toolbar" aria-label="Filtrar tarefas por contexto">
            {ALL_CONTEXTS.map(({ id, label, color }) => {
                const isActive = activeFilter === id;
                return (
                    <button
                        key={label}
                        className="filter-btn"
                        onClick={() => onFilterChange(id)}
                        data-active={isActive}
                        aria-pressed={isActive}
                        style={{
                           // @ts-ignore
                           '--context-color': color
                        }}
                    >
                        {label}
                    </button>
                )
            })}
        </div>
    );
};

export default FilterButtons;
