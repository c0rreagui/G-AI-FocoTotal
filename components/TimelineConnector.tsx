import React from 'react';

interface TimelineConnectorProps {
    position?: 'top' | 'bottom';
    contextColor: string;
    controlX?: number;
    controlY?: number;
}

const TimelineConnector: React.FC<TimelineConnectorProps> = ({ position, contextColor, controlX = 50, controlY = 50 }) => {
    // A altura do conector agora é totalmente dinâmica via CSS (usando a var --timeline-wave-y),
    // então o SVG só precisa se preocupar em desenhar a curva dentro de seu container.
    // Usamos uma viewBox de 100x100 para facilitar os cálculos percentuais da curva.

    // Ponto de partida (âncora no card)
    const startX = 50;
    const startY = 0; // Topo do SVG (mais próximo do card)

    // Ponto final (âncora na linha do tempo)
    const endX = 50;
    const endY = 100; // Fundo do SVG (onde a linha do tempo está)

    // A curva de Bézier quadrática cria uma forma orgânica.
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