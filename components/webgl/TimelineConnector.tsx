import React from 'react';
// NOVO: Usa CubicBezierLine para criar uma curva "S" mais autêntica.
import { CubicBezierLine } from '@react-three/drei';
import { Vector3 } from 'three';

interface TimelineConnectorProps {
    start: Vector3;
    end: Vector3;
    color: string;
}

/**
 * Renderiza um "galho" (uma curva 'S' autêntica) que liga
 * o "tronco" (feixe) à "folha" (card).
 */
const TimelineConnector: React.FC<TimelineConnectorProps> = ({ start, end, color }) => {

    // Para uma curva "S" verdadeira, precisamos de dois pontos de controle.
    
    // 1. O primeiro ponto de controle sai do tronco.
    // Ele sobe um pouco (25% da altura) e se projeta para fora (em Z).
    const startControl = new Vector3(
        start.x,
        start.y + (end.y - start.y) * 0.25,
        start.z + 4.0
    );

    // 2. O segundo ponto de controle chega na folha.
    // Ele está mais acima (75% da altura) e também projetado para fora.
    const endControl = new Vector3(
        end.x,
        start.y + (end.y - start.y) * 0.75,
        end.z + 4.0
    );

    return (
        <CubicBezierLine
            start={start}
            end={end}
            // FIX: Renomeado `startControlPoint` e `endControlPoint` para `midA` e `midB` para corresponder à API do CubicBezierLine.
            midA={startControl}
            midB={endControl}
            color={color}
            lineWidth={2}
            opacity={0.5}
            transparent
        />
    );
};

export default TimelineConnector;