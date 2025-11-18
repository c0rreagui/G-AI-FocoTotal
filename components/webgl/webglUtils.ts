import { Vector3, CatmullRomCurve3 } from 'three';

/**
 * Gera uma linha reta base para o feixe central.
 * O movimento será feito inteiramente via Shader para garantir fluidez.
 */
export const generateTendrilPoints = (pointCount: number, spacing: number): Vector3[] => {
    if (pointCount <= 1) return [new Vector3(0, 0, 0), new Vector3(spacing, 0, 0)];
    
    const pointsArray: Vector3[] = [];
    const startPositionX = -((pointCount - 1) * spacing) / 2;
    
    for (let i = 0; i < pointCount; i++) {
        pointsArray.push(new Vector3(startPositionX + i * spacing, 0, 0));
    }
    
    return pointsArray;
};

/**
 * Gera uma curva suave para os ramos (Branches).
 * Ajustado para sair "tangente" ao fluxo e pousar suavemente no card.
 */
export const generateBranchCurve = (start: Vector3, end: Vector3, tension: number = 0.5): CatmullRomCurve3 => {
    const distance = start.distanceTo(end);
    
    // P1: Ponto de saída (segue a direção do fluxo principal por um tempo)
    const p1 = new Vector3(start.x + 2, start.y, start.z);
    
    // P2: Ponto intermediário suavizado (uma barriga suave)
    const p2 = new Vector3(
        (start.x + end.x) / 2,
        start.y + (end.y - start.y) * 0.3, // Mantém baixo no começo
        (start.z + end.z) / 2 + 1 // Leve curva para fora
    );

    // P3: Chegada no card (entra por baixo/lado suavemente)
    const p3 = new Vector3(end.x - 1, end.y - 0.5, end.z);

    return new CatmullRomCurve3([start, p1, p2, p3, end], false, 'catmullrom', tension);
};