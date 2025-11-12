import { useEffect, RefObject } from 'react';

// Parâmetros da onda para um visual natural
const WAVE_CONFIG = {
    amplitude1: 15,
    frequency1: 0.015,
    amplitude2: 5,
    frequency2: 0.05,
    speed: 0.0005,
    yOffset: 50, // Posição vertical central dentro da "tela" SVG
};

export const useWavyTimeline = (pathRef: RefObject<SVGPathElement>) => {
    useEffect(() => {
        const path = pathRef.current;
        if (!path) return;

        let animationFrameId: number;

        const animate = (time: number) => {
            const parent = path.parentElement as SVGElement | null;
            if (!parent) return;

            const width = parent.getBoundingClientRect().width;
            let pathData = `M 0,${WAVE_CONFIG.yOffset}`;
            
            for (let x = 0; x <= width; x += 5) { // Incremento de 5px para melhor performance
                // Combinação de duas ondas senoidais para uma curva mais natural
                const y1 = Math.sin(x * WAVE_CONFIG.frequency1 + time * WAVE_CONFIG.speed) * WAVE_CONFIG.amplitude1;
                const y2 = Math.sin(x * WAVE_CONFIG.frequency2 + time * WAVE_CONFIG.speed * 0.7) * WAVE_CONFIG.amplitude2;
                const y = WAVE_CONFIG.yOffset + y1 + y2;
                pathData += ` L ${x},${y}`;
            }

            path.setAttribute('d', pathData);
            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [pathRef]);
};
