import { useEffect, RefObject, useState } from 'react';

type Point = [number, number];
interface Branch {
    id: number;
    d: string;
}

const ROUGHNESS = 0.6; // How jagged the lightning is
const Y_OFFSET = 50;   // Vertical center in the 100-unit high SVG viewport
const MAX_DISPLACEMENT = 25;
const BRANCH_CHANCE = 0.05; // Chance per frame to spawn a new branch
const MAX_BRANCHES = 4;
const BRANCH_LIFESPAN = 1000; // in ms

const midpointDisplacement = (start: Point, end: Point, displacement: number, points: Point[] = [start]) => {
    if (displacement < 1) {
        points.push(end);
        return points;
    }

    const [startX, startY] = start;
    const [endX, endY] = end;

    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2 + (Math.random() * 2 - 1) * displacement;

    midpointDisplacement(start, [midX, midY], displacement * ROUGHNESS, points);
    midpointDisplacement([midX, midY], end, displacement * ROUGHNESS, points);
};

const pointsToPath = (points: Point[]) => {
    return points.reduce((path, point, i) => {
        const [x, y] = point;
        return i === 0 ? `M ${x},${y}` : `${path} L ${x},${y}`;
    }, '');
};

const findYatX = (x: number, points: Point[]): number => {
    if (!points || points.length < 2) return Y_OFFSET;
    
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        if (x >= p1[0] && x <= p2[0]) {
            const t = (x - p1[0]) / (p2[0] - p1[0]);
            return p1[1] + t * (p2[1] - p1[1]);
        }
    }
    return points[points.length - 1][1];
};

export const useWavyTimeline = (pathRef: RefObject<SVGPathElement>, gridRef: RefObject<HTMLDivElement>) => {
    const [branches, setBranches] = useState<Branch[]>([]);

    useEffect(() => {
        const path = pathRef.current;
        const grid = gridRef.current;
        if (!path || !grid) return { branches: [] };

        let animationFrameId: number;
        let mainPathPoints: Point[] = [];

        const animate = () => {
            const parent = path.closest('svg');
            if (!parent) return;

            const width = parent.getBoundingClientRect().width;
            
            // Generate main lightning path
            const newPoints: Point[] = [];
            midpointDisplacement([0, Y_OFFSET], [width, Y_OFFSET], MAX_DISPLACEMENT, newPoints);
            mainPathPoints = newPoints.sort((a,b) => a[0] - b[0]);
            const pathData = pointsToPath(mainPathPoints);
            path.setAttribute('d', pathData);

            // Update branch states
            setBranches(prev => {
                let newBranches = prev.filter(b => Date.now() - b.id < BRANCH_LIFESPAN);
                
                if (newBranches.length < MAX_BRANCHES && Math.random() < BRANCH_CHANCE) {
                    const startPointIndex = Math.floor(Math.random() * (mainPathPoints.length - 1));
                    const startPoint = mainPathPoints[startPointIndex];
                    const endPoint: Point = [
                        startPoint[0] + (Math.random() * 100 - 50),
                        startPoint[1] + (Math.random() * 80 - 40)
                    ];
                    
                    const branchPoints: Point[] = [];
                    midpointDisplacement(startPoint, endPoint, MAX_DISPLACEMENT / 2, branchPoints);
                    newBranches.push({ id: Date.now(), d: pointsToPath(branchPoints) });
                }
                return newBranches;
            });
            
            // Update CSS variables for connectors
            const dayElements = grid.querySelectorAll('.timeline-day-group') as NodeListOf<HTMLElement>;
            dayElements.forEach(dayEl => {
                const centerX = dayEl.offsetLeft + dayEl.offsetWidth / 2;
                const waveY = findYatX(centerX, mainPathPoints);
                dayEl.style.setProperty('--timeline-wave-y', `${waveY.toFixed(2)}px`);
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [pathRef, gridRef]);
    
    return { branches };
};