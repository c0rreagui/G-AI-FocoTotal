import * as THREE from 'three';

/**
 * Generates the points for a single chaotic "tendril" curve.
 * This function is isolated to prevent variable name conflicts during code minification,
 * which can cause a "Temporal Dead Zone" error (e.g., "Cannot access 'y' before initialization").
 * It uses a standard for-loop and hyper-defensive variable names for maximum compatibility with bundlers.
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
        // Use verbose variable names to further reduce collision risks.
        const randomOffsetY = (Math.random() - 0.5) * spread;
        const randomOffsetZ = (Math.random() - 0.5) * spread;
        pointsArray.push(new THREE.Vector3(currentPositionX, randomOffsetY, randomOffsetZ));
    }
    
    return pointsArray;
};