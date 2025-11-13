import React from 'react';

interface TimelineConnectorProps {
    position?: 'top' | 'bottom';
    contextColor: string;
    controlX?: number;
    controlY?: number;
}

const TimelineConnector: React.FC<TimelineConnectorProps> = ({ position, contextColor, controlX = 25, controlY = 50 }) => {
    // A altura do conector agora é baseada dinamicamente na posição Y da onda
    // herdada do elemento pai (.timeline-day-group) através de uma variável CSS.
    // O caminho SVG é desenhado dentro de uma viewBox de 100x100 para facilitar o cálculo.

    // Ponto de partida (âncora no card)
    const startX = 50;
    const startY = 0; // Topo do SVG

    // Ponto final (âncora na linha do tempo)
    // O cálculo da altura real é feito em CSS usando a variável --timeline-wave-y,
    // então o SVG só precisa se preocupar com a forma da curva.
    const endX = 50;
    const endY = 100; // Fundo do SVG

    const pathData = `M ${startX},${startY} Q ${controlX},${controlY} ${endX},${endY}`;

    return (
        <svg
            className="timeline-event-connector"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            style={{ '--context-color': contextColor } as React.CSSProperties}
        >
            <path
                className="timeline-event-connector-path"
                d={pathData}
            />
        </svg>
    );
};

export default TimelineConnector;