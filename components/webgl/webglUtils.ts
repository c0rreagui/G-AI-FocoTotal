import * as THREE from 'three';

/**
 * Generates the points for a single chaotic "tendril" curve.
 * This function is isolated to prevent variable name conflicts during code minification.
 * It uses a standard for-loop and in-line calculations to be hyper-defensive against
 * bundler optimization errors like "Temporal Dead Zone".
 */
export const generateTendrilPoints = (pointCount: number, spacing: number, spread: number): THREE.Vector3[] => {
    // Ensure there are at least two points to form a line.
    if (pointCount <= 1) {
        return [new THREE.Vector3(0, 0, 0), new THREE.Vector3(spacing, 0, 0)];
    }
    
    const pointsArray: THREE.Vector3[] = [];
    const startPositionX = -((pointCount - 1) * spacing) / 2;
    
    for (let i = 0; i < pointCount; i++) {
        const currentPositionX = startPositionX + i * spacing;
        
        // CORREÇÃO DEFINITIVA: Os cálculos são feitos "in-line" dentro do construtor Vector3
        // para eliminar variáveis intermediárias (`randomOffsetY`, `randomOffsetZ`).
        // Esta é a correção mais robusta para prevenir o erro de minificação
        // "Cannot access 'y' before initialization" (Temporal Dead Zone).
        pointsArray.push(new THREE.Vector3(
            currentPositionX,
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread
        ));
    }
    
    return pointsArray;
};
