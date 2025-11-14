// FIX: Replaced `* as THREE` with direct import of `Vector3` to resolve type errors.
import { Vector3 } from 'three';

/**
 * Generates the points for a single chaotic "tendril" curve.
 * This function is isolated to prevent variable name conflicts during code minification.
 * It uses a standard for-loop and in-line calculations to be hyper-defensive against
 * bundler optimization errors like "Temporal Dead Zone".
 */
export const generateTendrilPoints = (pointCount: number, spacing: number, spread: number): Vector3[] => {
    // Ensure there are at least two points to form a line.
    if (pointCount <= 1) {
        // FIX: Use imported Vector3 class.
        return [new Vector3(0, 0, 0), new Vector3(spacing, 0, 0)];
    }
    
    // FIX: Use imported Vector3 type.
    const pointsArray: Vector3[] = [];
    const startPositionX = -((pointCount - 1) * spacing) / 2;
    
    for (let i = 0; i < pointCount; i++) {
        const currentPositionX = startPositionX + i * spacing;
        
        // CORREÇÃO DEFINITIVA: Os cálculos são feitos "in-line" dentro do construtor Vector3
        // para eliminar variáveis intermediárias (`randomOffsetY`, `randomOffsetZ`).
        // Esta é a correção mais robusta para prevenir o erro de minificação
        // "Cannot access 'y' before initialization" (Temporal Dead Zone).
        // FIX: Use imported Vector3 class.
        pointsArray.push(new Vector3(
            currentPositionX,
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread
        ));
    }
    
    return pointsArray;
};