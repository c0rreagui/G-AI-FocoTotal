import React from 'react';
import { Task } from '../types';
import { useToast } from '../contexts/ToastContext';
import { optimizeSchedule, summarizePeriod } from '../utils/aiUtils';
import Tooltip from './ui/Tooltip';

type ZoomLevel = 'month' | 'week' | 'day' | 'hour';
type Grouping = 'date' | 'context';
type Density = 'default' | 'compact';

interface TimelineControlsProps {
    tasks: Task[];
    onUpdateTasks: (tasks: (Partial<Task> & {id: string})[]) => Promise<any>;
    zoom: ZoomLevel;
    onZoomChange: (zoom: ZoomLevel) => void;
    grouping: Grouping;
    onGroupingChange: (grouping: Grouping) => void;
    density: Density;
    onDensityChange: (density: Density) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onScrollToToday: () => void;
    onPrev: () => void;
    onNext: () => void;
}

const TimelineControls: React.FC<TimelineControlsProps> = (props) => {
    const { 
        tasks, onUpdateTasks, zoom, onZoomChange, grouping, onGroupingChange, 
        density, onDensityChange, searchQuery, onSearchChange, onScrollToToday,
        onPrev, onNext
    } = props;
    
    const { showToast } = useToast();

    const handleOptimize = () => {
        const { suggestions, summary } = optimizeSchedule(tasks);
        
        if (suggestions.length > 0) {
            showToast(summary, 'default', {
                label: 'Aplicar',
                onClick: () => {
                    onUpdateTasks(suggestions)
                        .then(() => showToast('Cronograma otimizado!', 'success'))
                        .catch(() => showToast('Falha ao aplicar otimização.', 'error'));
                }
            });
        } else {
            showToast(summary, 'default');
        }
    };

    const handleSummarize = () => {
        const summary = summarizePeriod(tasks);
        showToast(summary, 'default');
    };

    return (
        <div className="timeline-controls">
             <Tooltip tip="Anterior">
                 <button className="icon-btn" onClick={onPrev} aria-label="Período anterior">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
            </Tooltip>
             <Tooltip tip="Próximo">
                 <button className="icon-btn" onClick={onNext} aria-label="Próximo período">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
            </Tooltip>
            <div className="timeline-control-divider"></div>
            <div className="timeline-control-group">
                <button className={`timeline-control-btn ${zoom === 'hour' ? 'active' : ''}`} onClick={() => onZoomChange('hour')}>Hora</button>
                <button className={`timeline-control-btn ${zoom === 'day' ? 'active' : ''}`} onClick={() => onZoomChange('day')}>Dia</button>
                <button className={`timeline-control-btn ${zoom === 'week' ? 'active' : ''}`} onClick={() => onZoomChange('week')}>Semana</button>
                <button className={`timeline-control-btn ${zoom === 'month' ? 'active' : ''}`} onClick={() => onZoomChange('month')}>Mês</button>
            </div>
            <div className="timeline-control-divider"></div>
            <div className="timeline-control-group">
                 <button className={`timeline-control-btn ${grouping === 'date' ? 'active' : ''}`} onClick={() => onGroupingChange('date')}>Data</button>
                 <button className={`timeline-control-btn ${grouping === 'context' ? 'active' : ''}`} onClick={() => onGroupingChange('context')}>Contexto</button>
            </div>
             <div className="timeline-control-divider"></div>
             <input 
                type="search"
                placeholder="Buscar tarefas..."
                className="timeline-search-input"
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
            />
            <Tooltip tip="Ir para hoje">
                 <button className="icon-btn" onClick={onScrollToToday} aria-label="Ir para o dia de hoje">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"></circle><line x1="12" y1="2" x2="12" y2="4"></line><line x1="12" y1="20" x2="12" y2="22"></line><line x1="4" y1="12" x2="2" y2="12"></line><line x1="22" y1="12" x2="20" y2="12"></line></svg>
                </button>
            </Tooltip>
            <Tooltip tip="Otimizar cronograma da semana (IA Local)">
                <button className="icon-btn" onClick={handleOptimize} aria-label="Otimizar cronograma">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path><path d="M5 3v4"></path><path d="M19 17v4"></path><path d="M3 5h4"></path><path d="M17 19h4"></path></svg>
                </button>
            </Tooltip>
             <Tooltip tip="Resumir próxima semana (IA Local)">
                <button className="icon-btn" onClick={handleSummarize} aria-label="Resumir cronograma">
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path></svg>
                </button>
            </Tooltip>
        </div>
    );
};

export default TimelineControls;