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

const calculateWaveY = (x: number, time: number) => {
    const y1 = Math.sin(x * WAVE_CONFIG.frequency1 + time * WAVE_CONFIG.speed) * WAVE_CONFIG.amplitude1;
    const y2 = Math.sin(x * WAVE_CONFIG.frequency2 + time * WAVE_CONFIG.speed * 0.7) * WAVE_CONFIG.amplitude2;
    return WAVE_CONFIG.yOffset + y1 + y2;
};

export const useWavyTimeline = (pathRef: RefObject<SVGPathElement>, gridRef: RefObject<HTMLDivElement>) => {
    useEffect(() => {
        const path = pathRef.current;
        const grid = gridRef.current;
        if (!path || !grid) return;

        let animationFrameId: number;

        const animate = (time: number) => {
            const parent = path.parentElement as SVGElement | null;
            if (!parent) return;

            const width = parent.getBoundingClientRect().width;
            let pathData = `M 0,${calculateWaveY(0, time)}`;
            
            for (let x = 0; x <= width; x += 5) { // Incremento de 5px para melhor performance
                const y = calculateWaveY(x, time);
                pathData += ` L ${x},${y}`;
            }
            path.setAttribute('d', pathData);

            // Atualiza as posições Y para os conectores
            const dayElements = grid.querySelectorAll('.timeline-day-group') as NodeListOf<HTMLElement>;
            dayElements.forEach(dayEl => {
                const centerX = dayEl.offsetLeft + dayEl.offsetWidth / 2;
                const waveY = calculateWaveY(centerX, time);
                dayEl.style.setProperty('--timeline-wave-y', `${waveY.toFixed(2)}px`);
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [pathRef, gridRef]);
};