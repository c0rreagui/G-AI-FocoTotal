import { Vector3, CatmullRomCurve3 } from 'three';

export const generateTendrilPoints = (pointCount: number, spacing: number): Vector3[] => {
    if (pointCount <= 1) return [new Vector3(0, 0, 0), new Vector3(spacing, 0, 0)];
    const pointsArray: Vector3[] = [];
    const startPositionX = -((pointCount - 1) * spacing) / 2;
    for (let i = 0; i < pointCount; i++) {
        pointsArray.push(new Vector3(startPositionX + i * spacing, 0, 0));
    }
    return pointsArray;
};

export const generateBranchCurve = (start: Vector3, end: Vector3): CatmullRomCurve3 => {
    // Tangente inicial longa (sai fluindo do tubo)
    const p1 = new Vector3(start.x + 3.0, start.y, start.z); 
    
    // Ponto médio elevado
    const p2 = new Vector3(
        (start.x + end.x) / 2,
        start.y + (end.y - start.y) * 0.5, 
        (start.z + end.z) / 2 + 2.5 // Curva acentuada para fora
    );

    // Chegada suave no card
    const p3 = new Vector3(end.x - 1.5, end.y - 0.5, end.z + 0.5);

    return new CatmullRomCurve3([start, p1, p2, p3, end], false, 'catmullrom', 0.3);
};