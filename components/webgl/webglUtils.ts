import { Vector3, CatmullRomCurve3 } from 'three';

/**
 * Gera uma linha reta base para o feixe central.
 * A curvatura será aplicada inteiramente pelo Shader para garantir fluidez.
 */
export const generateTendrilPoints = (pointCount: number, spacing: number): Vector3[] => {
    if (pointCount <= 1) return [new Vector3(0, 0, 0), new Vector3(spacing, 0, 0)];
    
    const pointsArray: Vector3[] = [];
    // Centraliza a linha no mundo
    const startPositionX = -((pointCount - 1) * spacing) / 2;
    
    for (let i = 0; i < pointCount; i++) {
        // Y e Z são 0 para garantir uma base estável. O Shader fará a onda.
        pointsArray.push(new Vector3(startPositionX + i * spacing, 0, 0));
    }
    
    return pointsArray;
};

/**
 * Gera uma curva suave para os ramos (Branches).
 * Ajustado para sair "tangente" ao fluxo e pousar suavemente no card.
 */
export const generateBranchCurve = (start: Vector3, end: Vector3): CatmullRomCurve3 => {
    const distance = start.distanceTo(end);
    
    // P1: Sai do tronco seguindo o fluxo (tangente X)
    const p1 = new Vector3(start.x + 2, start.y, start.z);
    
    // P2: Sobe suavemente (barriga da curva)
    const p2 = new Vector3(
        (start.x + end.x) / 2,
        start.y + (end.y - start.y) * 0.4, 
        (start.z + end.z) / 2 + 1.5 // Sai um pouco para fora da tela (3D)
    );

    // P3: Chega no card por baixo
    const p3 = new Vector3(end.x - 0.5, end.y - 0.8, end.z);

    return new CatmullRomCurve3([start, p1, p2, p3, end], false, 'catmullrom', 0.4);
};