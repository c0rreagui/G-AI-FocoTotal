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

const useResponsiveLayout = () => {
    const { size } = useThree();
    const width = size.width;
    const isMobile = width < 600;
    
    return {
        isMobile,
        cardSpacingX: isMobile ? 5 : 9, 
        cardBaseY: isMobile ? 3.0 : 3.8, // Um pouco mais alto para sair do "brilho"
        zoomDistance: isMobile ? 32 : 24, 
        particleCount: isMobile ? 60 : 350,
        cardScale: isMobile ? 0.9 : 1.0 
    };
};

const DayMarker: React.FC<{ position: THREE.Vector3, label: string }> = ({ position, label }) => (
    <Text
        position={[position.x, -4.5, position.z]} // Bem abaixo do rio
        fontSize={0.5}
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
    onDateDoubleClick: (date: string) => void;
}

const TimelineScene: React.FC<TimelineSceneProps> = (props) => {
    const { tasks, dateArray, zoom, onEditRequest, onUpdateTask } = props;
    const { isMobile, cardSpacingX, cardBaseY, zoomDistance, particleCount, cardScale } = useResponsiveLayout();
    const { camera } = useThree();
    
    const [draggingTask, setDraggingTask] = useState<Task | null>(null);
    const planeRef = useRef<THREE.Mesh>(null);
    const dragOffset = useRef(new THREE.Vector3()); 
    const groupRefs = useRef(new Map<string, THREE.Group>());

    useEffect(() => {
        // Posição inicial ligeiramente elevada para ver o "rio" de cima
        camera.position.set(0, 8, zoomDistance);
        camera.lookAt(0, 0, 0);
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
        return dateArray.map((_, i) => new THREE.Vector3((i - (dateArray.length - 1) / 2) * cardSpacingX, 0, 0));
    }, [dateArray, cardSpacingX]);

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
        if (cardGroup) {
            cardGroup.position.set(intersection.x, Math.max(intersection.y, 2), 0);
        }
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
            {/* Fundo espacial profundo */}
            <color attach="background" args={['#02010a']} />
            <fogExp2 attach="fog" args={['#02010a', 0.02]} />

            {/* Iluminação Global Suave */}
            <ambientLight intensity={0.4} />
            <hemisphereLight args={['#a5b4fc', '#000000', 0.6]} />
            
            {/* Luzes de Destaque */}
            <pointLight position={[10, 10, 10]} intensity={1.0} color="#c084fc" distance={40} />
            <pointLight position={[-10, 5, 5]} intensity={1.0} color="#818cf8" distance={40} />

            <FloatingParticles count={particleCount} range={90} />

            <OrbitControls 
                enableZoom={true}
                enablePan={true}
                enableRotate={true}
                enableDamping={true} 
                dampingFactor={0.05}
                minDistance={15}  // Previne entrar no feixe
                maxDistance={80}
                maxPolarAngle={Math.PI / 2 - 0.05}
                minPolarAngle={0.1}
                mouseButtons={{
                    LEFT: THREE.MOUSE.PAN,
                    MIDDLE: THREE.MOUSE.ROTATE,
                    RIGHT: THREE.MOUSE.ROTATE
                }}
            />
            
            <EnergyBeam 
                pointCount={Math.max(dateArray?.length || 0, 2) * 3} 
                spacing={cardSpacingX / 3} 
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
                            // Espalha mais verticalmente no mobile para facilitar toque
                            const heightVariation = j * (isMobile ? 4.0 : 3.2); 
                            const altOffset = isAlt ? 1.8 : 0;
                            
                            const cardY = cardBaseY + heightVariation + altOffset;
                            const randomXOffset = (task.id.charCodeAt(0) % 3 - 1) * 1.0; 
                            const cardX = nodePos.x + randomXOffset;

                            const pos = new THREE.Vector3(cardX, cardY, 0);
                            const color = CONTEXTS[task.context]?.color || '#6366f1';

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
                                        scale={cardScale}
                                    />
                                    <TimelineBranch start={nodePos} end={pos} color={color} />
                                </group>
                            );
                        })}
                    </group>
                );
            })}

            <EffectComposer disableNormalPass>
                {/* Bloom suavizado para não "estourar" o branco */}
                <Bloom luminanceThreshold={0.3} mipmapBlur intensity={1.2} radius={0.4} />
                <Noise opacity={0.03} />
                <Vignette eskil={false} offset={0.1} darkness={0.5} />
            </EffectComposer>
        </>
    );
};

export default TimelineScene;