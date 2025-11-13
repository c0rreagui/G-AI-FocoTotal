import React, { useState, useEffect, useRef, RefObject, ReactElement } from 'react';
import { Task } from '../types';
import { CONTEXTS } from '../constants';

interface TimelineWaveProps {
    tasks: Task[];
    cardLayouts: Record<string, { rect: DOMRect; position: 'top' | 'bottom' }>;
    gridSize: { width: number; height: number };
    gridRef: RefObject<HTMLDivElement>;
}

// Parâmetros da onda para um visual natural
const WAVE_CONFIG = {
    amplitude1: 15, frequency1: 0.015,
    amplitude2: 5, frequency2: 0.05,
    speed: 0.0005,
};

// Calcula a posição Y da onda em um determinado ponto X e tempo
const calculateWaveY = (x: number, time: number, containerHeight: number) => {
    const yOffset = containerHeight / 2;
    if (isNaN(yOffset)) return 0;
    const y1 = Math.sin(x * WAVE_CONFIG.frequency1 + time * WAVE_CONFIG.speed) * WAVE_CONFIG.amplitude1;
    const y2 = Math.sin(x * WAVE_CONFIG.frequency2 + time * WAVE_CONFIG.speed * 0.7) * WAVE_CONFIG.amplitude2;
    return yOffset + y1 + y2;
};

// Componente para renderizar um único conector curvo
const TimelineConnector: React.FC<{
    startX: number; startY: number; endX: number; endY: number;
    position: 'top' | 'bottom'; contextColor: string;
// FIX: Explicitly typed the return of the memoized component as React.ReactElement to resolve the "Cannot find namespace 'JSX'" error.
// This helps TypeScript's type inference within the React.memo HOC.
}> = React.memo(({ startX, startY, endX, endY, position, contextColor }): React.ReactElement => {
    const verticalOffset = Math.abs(endY - startY) * 0.6;
    const ctrl1Y = position === 'bottom' ? startY + verticalOffset : startY - verticalOffset;
    const ctrl2Y = position === 'bottom' ? endY - verticalOffset : endY + verticalOffset;
    const pathData = `M ${startX} ${startY} C ${startX} ${ctrl1Y}, ${endX} ${ctrl2Y}, ${endX} ${endY}`;
    return <path d={pathData} className="timeline-connector-path" style={{ '--context-color': contextColor } as React.CSSProperties} />;
});
TimelineConnector.displayName = 'TimelineConnector';


const TimelineWave: React.FC<TimelineWaveProps> = ({ tasks, cardLayouts, gridSize, gridRef }) => {
    const [mainPathD, setMainPathD] = useState('');
    // FIX: Changed state type from JSX.Element[] to React.ReactElement[] to rely on the imported React namespace, making it more robust.
    const [connectorPaths, setConnectorPaths] = useState<React.ReactElement[]>([]);
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || !gridRef.current || gridSize.width === 0) return;

        let animationFrameId: number;

        const animate = (time: number) => {
            if (!gridRef.current) {
                animationFrameId = requestAnimationFrame(animate);
                return;
            }
            
            const { width, height } = gridSize;

            // Anima a linha do tempo principal
            let mainPathData = `M 0,${calculateWaveY(0, time, height)}`;
            for (let x = 0; x <= width; x += 10) {
                mainPathData += ` L ${x},${calculateWaveY(x, time, height)}`;
            }
            setMainPathD(mainPathData);

            // Anima os conectores
            const newConnectors = tasks.flatMap(task => {
                const layout = cardLayouts[task.id];
                if (!layout || task.context === 'Marco') return [];

                const cardRect = layout.rect;
                const position = layout.position;
                
                const startX = cardRect.x + cardRect.width / 2;
                const endX = startX;
                const endY = calculateWaveY(endX, time, height);
                const startY = position === 'top' ? cardRect.bottom : cardRect.top;

                return (
                    <TimelineConnector
                        key={task.id}
                        startX={startX} startY={startY}
                        endX={endX} endY={endY}
                        position={position}
                        contextColor={CONTEXTS[task.context!]?.color || 'var(--primary)'}
                    />
                );
            });
            setConnectorPaths(newConnectors);

            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrameId);
    }, [cardLayouts, gridSize, tasks, gridRef]);

    return (
        <svg
            ref={svgRef}
            className="wavy-timeline-svg"
            style={{ width: gridSize.width, height: gridSize.height }}
            aria-hidden="true"
        >
            <defs>
                <filter id="wavy-connector-filter" x="-50%" y="-50%" width="200%" height="200%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.05 0.5" numOctaves="2" result="turbulence" />
                    <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="3" result="displaced" />
                    <feGaussianBlur in="displaced" stdDeviation="2" result="blur" />
                    <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="glow" />
                    <feComposite in="SourceGraphic" in2="glow" operator="over" />
                </filter>
            </defs>
            <g filter="url(#wavy-connector-filter)">
                <path d={mainPathD} className="wavy-timeline-path" />
                {connectorPaths}
            </g>
        </svg>
    );
};

export default TimelineWave;