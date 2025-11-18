import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Task, TimelineZoomLevel } from '../../types';
import { OrbitControls, Text, Plane } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import EnergyBeam from './EnergyBeam'; 
import TimelineCard3D from './TimelineCard3D'; 
import TimelineBranch from './TimelineBranch'; 
import FloatingParticles from './FloatingParticles';
import { CONTEXTS } from '../../constants';
import * as THREE from 'three';
import { ThreeEvent, useThree } from '@react-three/fiber';
import { format } from 'date-fns';

// --- Hook de Responsividade 3D ---
const useResponsiveLayout = () => {
    const { size } = useThree();
    const width = size.width;
    
    // Breakpoints aproximados em pixels (dentro do Canvas)
    const isMobile = width < 600;
    const isTablet = width >= 600 && width < 1024;
    
    return {
        isMobile,
        isTablet,
        cardSpacing: isMobile ? 5 : (isTablet ? 6 : 9), // Mais espaço no desktop
        cardBaseY: isMobile ? 3 : 4, // Cards mais baixos no mobile
        zoomDistance: isMobile ? 25 : 20, // Câmera mais longe no mobile para ver mais
        particleCount: isMobile ? 50 : 200 // Menos partículas no mobile (performance)
    };
};

// --- Marcador de Dia ---
const DayMarker: React.FC<{ position: THREE.Vector3, label: string }> = ({ position, label }) => (
    <Text
        position={[position.x, -3, position.z]}
        fontSize={0.4}
        color="#64748b" 
        anchorX="center"
        anchorY="top"
        font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
    >
        {label}
    </Text>
);

interface TimelineSceneProps {
    tasks: Task[];
    dateArray: string[];
    zoom: TimelineZoomLevel;
    onEditRequest: (task: Task, trigger: HTMLElement) => void;
    onUpdateTask: (task: Partial<Task> & { id: string }) => Promise<void>;
}

const TimelineScene: React.FC<TimelineSceneProps> = ({ tasks, dateArray, zoom, onEditRequest, onUpdateTask }) => {
    const { isMobile, cardSpacing, cardBaseY, zoomDistance, particleCount } = useResponsiveLayout();
    const { camera } = useThree();
    
    const [draggingTask, setDraggingTask] = useState<Task | null>(null);
    const planeRef = useRef<THREE.Mesh>(null);
    const dragOffset = useRef(new THREE.Vector3()); 
    const groupRefs = useRef(new Map<string, THREE.Group>());

    // Ajusta posição inicial da câmera baseada no dispositivo
    useEffect(() => {
        camera.position.z = zoomDistance;
        camera.position.y = 5;
    }, [zoomDistance, camera]);

    const { dateMap } = useMemo(() => {
        const map = new Map<string, Task[]>();
        tasks.forEach(task => {
            if (task.dueDate) {
                const dateStr = zoom === 'hour' ? task.dueDate : task.dueDate.substring(0, 10);
                if (!map.has(dateStr)) map.set(dateStr, []);
                map.get(dateStr)!.push(task);
            }
        });
        return { dateMap: map };
    }, [tasks, zoom]);

    const beamNodes = useMemo(() => {
        if (!dateArray?.length) return [];
        return dateArray.map((_, i) => new THREE.Vector3((i - (dateArray.length - 1) / 2) * cardSpacing, 0, 0));
    }, [dateArray, cardSpacing]);

    const handleDragStart = (e: ThreeEvent<PointerEvent>, task: Task) => {
        if (e.button !== 0) return; 
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setDraggingTask(task);
        
        const intersection = new THREE.Vector3();
        e.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), intersection);
        
        const cardGroup = groupRefs.current.get(task.id);
        if (cardGroup) dragOffset.current.subVectors(cardGroup.position, intersection);
    };

    const handleDragMove = (e: ThreeEvent<PointerEvent>) => {
        if (!draggingTask || !planeRef.current) return;
        e.stopPropagation();
        const intersection = e.point;
        intersection.add(dragOffset.current);
        const cardGroup = groupRefs.current.get(draggingTask.id);
        if (cardGroup) cardGroup.position.set(intersection.x, Math.max(intersection.y, 2), 0);
    };

    const handleDragEnd = (e: ThreeEvent<PointerEvent>) => {
        if (!draggingTask) return;
        e.stopPropagation();
        const cardGroup = groupRefs.current.get(draggingTask.id);
        if (cardGroup) {
            let closest = 0, minDst = Infinity;
            beamNodes.forEach((node, i) => {
                const dst = Math.abs(cardGroup.position.x - node.x);
                if (dst < minDst) { minDst = dst; closest = i; }
            });
            const newDate = dateArray[closest];
            onUpdateTask({ id: draggingTask.id, dueDate: newDate !== draggingTask.dueDate ? newDate : undefined });
        }
        setDraggingTask(null);
    };

    return (
        <>
            <ambientLight intensity={0.1} />
            <pointLight position={[0, 5, 10]} intensity={1.5} color="#d8b4fe" distance={30} />
            
            <FloatingParticles count={particleCount} range={60} />

            <OrbitControls 
                enableZoom={true}
                enablePan={true}
                enableRotate={true} // Restaurado a pedido do User
                maxPolarAngle={Math.PI / 2 - 0.1} // Impede ver por baixo do chão (o vazio)
                minDistance={10} 
                maxDistance={50}
                mouseButtons={{
                    LEFT: THREE.MOUSE.PAN, // Pan no esquerdo (melhor pra UX de timeline)
                    MIDDLE: THREE.MOUSE.DOLLY, // Zoom no scroll/meio
                    RIGHT: THREE.MOUSE.ROTATE // Rotação no direito
                }}
            />
            
            <EnergyBeam 
                pointCount={Math.max(dateArray?.length || 0, 2) * 3} 
                spacing={cardSpacing / 3} 
                isMobile={isMobile}
            />

            <Plane
                ref={planeRef}
                args={[1000, 1000]}
                position={[0, 0, 0.5]}
                visible={false}
                onPointerMove={handleDragMove}
                onPointerUp={handleDragEnd}
                onPointerMissed={(e) => draggingTask && handleDragEnd(e)}
            />

            {dateArray?.map((dateStr, i) => {
                const tasksForNode = dateMap.get(dateStr) || [];
                const nodePos = beamNodes[i];
                if (!nodePos) return null;

                let label = "";
                try { label = zoom === 'hour' ? format(new Date(dateStr), 'HH:mm') : format(new Date(dateStr + 'T00:00:00'), 'dd MMM'); } catch {}

                return (
                    <group key={dateStr}>
                        <DayMarker position={nodePos} label={label} />
                        {tasksForNode.map((task, j) => {
                            const isAlt = j % 2 !== 0;
                            const cardY = cardBaseY + (j * (isMobile ? 3.5 : 3.0)) + (isAlt ? 1.5 : 0);
                            const cardX = nodePos.x + (j % 3 - 1) * (isMobile ? 0.5 : 1.5);
                            const pos = new THREE.Vector3(cardX, cardY, 0);
                            
                            return (
                                <group 
                                    key={task.id} 
                                    // @ts-ignore
                                    ref={(el) => el ? groupRefs.current.set(task.id, el) : groupRefs.current.delete(task.id)}
                                >
                                    <TimelineCard3D
                                        task={task}
                                        position={pos.toArray()}
                                        onClick={() => onEditRequest(task, document.body)}
                                        onDragStart={handleDragStart}
                                        scale={isMobile ? 0.85 : 1} // Cards menores no mobile
                                    />
                                    <TimelineBranch start={nodePos} end={pos} color={CONTEXTS[task.context]?.color || '#6366f1'} />
                                </group>
                            );
                        })}
                    </group>
                );
            })}

            <EffectComposer disableNormalPass>
                <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.0} radius={0.5} />
                <Noise opacity={0.02} />
                <Vignette eskil={false} offset={0.1} darkness={0.6} />
            </EffectComposer>
        </>
    );
};

export default TimelineScene;