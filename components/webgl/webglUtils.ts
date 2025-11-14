import * as THREE from 'three';

/**
 * Generates the points for a single chaotic "tendril" curve.
 * This function is isolated to prevent variable name conflicts during code minification,
 * which can cause a "Temporal Dead Zone" error (e.g., "Cannot access 'y' before initialization").
 * It uses a standard for-loop for maximum compatibility with bundlers.
 */
export const generateTendrilPoints = (pointCount: number, spacing: number, spread: number): THREE.Vector3[] => {
    // Ensure there are at least two points to form a line.
    if (pointCount <= 1) {
        return [new THREE.Vector3(0, 0, 0), new THREE.Vector3(spacing, 0, 0)];
    }
    
    const points: THREE.Vector3[] = [];
    const startX = -((pointCount - 1) * spacing) / 2;
    
    for (let i = 0; i < pointCount; i++) {
        const pointX = startX + i * spacing;
        // Use verbose variable names to further reduce collision risks.
        const randomYOffset = (Math.random() - 0.5) * spread;
        const randomZOffset = (Math.random() - 0.5) * spread;
        points.push(new THREE.Vector3(pointX, randomYOffset, randomZOffset));
    }
    
    return points;
};
