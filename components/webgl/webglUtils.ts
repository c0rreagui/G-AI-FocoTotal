import { Vector3, CatmullRomCurve3 } from 'three';

/**
 * Gera uma linha reta base. A magia acontece no Shader.
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
 * Gera a curva do ramo (Branch).
 * Ajustado para sair suavemente e pousar com elegância no card.
 */
export const generateBranchCurve = (start: Vector3, end: Vector3): CatmullRomCurve3 => {
    // P1: Sai tangente ao fluxo principal
    const p1 = new Vector3(start.x + 1.5, start.y, start.z);
    
    // P2: Sobe e curva para fora (efeito 3D)
    const p2 = new Vector3(
        (start.x + end.x) / 2,
        start.y + (end.y - start.y) * 0.5, 
        (start.z + end.z) / 2 + 2.0 
    );

    // P3: Prepara para entrar no card
    const p3 = new Vector3(end.x - 1.0, end.y - 0.5, end.z + 0.5);

    return new CatmullRomCurve3([start, p1, p2, p3, end], false, 'catmullrom', 0.5);
};