// FIX: Replaced `* as THREE` with direct import of `Vector3` to resolve type errors.
import { Vector3, CatmullRomCurve3 } from 'three';

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

/**
 * Gera pontos para um "Ramo" que sai organicamente do fluxo principal.
 * Usa uma Curva de Bezier Cúbica para garantir tangência na saída.
 */
export const generateBranchCurve = (start: Vector3, end: Vector3, chaos: number = 0.5): CatmullRomCurve3 => {
    // Pontos de controle para a curva S
    const distance = start.distanceTo(end);
    
    // Ponto de controle 1: Sai do tronco (mantém o Y e Z próximos do tronco por um tempo)
    // Isso faz parecer que o ramo está "descascando" do feixe principal
    const cp1 = new Vector3(
        start.x, // Sai na mesma direção X
        start.y, // Mantém altura inicial
        start.z  // Mantém profundidade inicial
    );

    // Ponto de controle 2: Meio do caminho, começa a subir e ficar caótico
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const cp2 = new Vector3(
        midX + (Math.random() - 0.5) * chaos,
        midY + (Math.random() - 0.5) * chaos,
        (start.z + end.z) / 2 + (Math.random() - 0.5) * chaos + 2 // Curva um pouco pra fora da tela
    );

    // Ponto de controle 3: Chegando no card
    const cp3 = new Vector3(
        end.x,
        end.y - 0.5, // Chega por baixo do card
        end.z + 0.5  // Um pouco à frente
    );

    // Criamos uma curva CatmullRom com mais pontos intermediários para suavidade
    const points = [
        start,
        new Vector3(start.x + distance * 0.1, start.y, start.z), // "Arrancada" suave
        cp2,
        cp3,
        end
    ];

    return new CatmullRomCurve3(points);
};