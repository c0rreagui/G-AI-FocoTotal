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
        cardBaseY: isMobile ? 3.5 : 4.5, 
        zoomDistance: isMobile ? 35 : 28, 
        particleCount: isMobile ? 60 : 350,
        cardScale: isMobile ? 1.1 : 1.0 
    };
};

const DayMarker: React.FC<{ position: THREE.Vector3, label: string }> = ({ position, label }) => (
    <Text
        position={[position.x, -5.5, position.z]}
        fontSize={0.6}
        color="#94a3b8" 
        anchorX="center"
        anchorY="top"
        font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
        fillOpacity={0.7}
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
    onDateDoubleClick?: (date: string) => void;
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
        document.body.style.cursor = draggingTask ? 'grabbing' : 'auto';
    }, [draggingTask]);

    useEffect(() => {
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
        // @ts-ignore
        e.target.setPointerCapture(e.pointerId);
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
            cardGroup.position.set(intersection.x, Math.max(intersection.y, 3.0), 0);
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
            {/* ATMOSFERA OMEGA */}
            <color attach="background" args={['#010005']} /> {/* Quase preto total */}
            <fogExp2 attach="fog" args={['#050209', 0.012]} />

            {/* ILUMINAÇÃO CINEMATOGRÁFICA */}
            <ambientLight intensity={0.4} />
            <hemisphereLight args={['#a78bfa', '#000000', 0.5]} /> {/* Luz de cima roxa */}
            
            {/* Luzes Key e Fill */}
            <pointLight position={[15, 20, 10]} intensity={2.0} color="#e9d5ff" distance={80} decay={2} />
            <pointLight position={[-20, 5, 5]} intensity={1.0} color="#4c1d95" distance={60} decay={2} />
            
            {/* Luz de Recorte (Rim Light) atrás do fluxo */}
            <pointLight position={[0, -10, -10]} intensity={3.0} color="#d8b4fe" distance={50} />

            <FloatingParticles count={particleCount} range={100} />

            <OrbitControls 
                enableZoom={true}
                enablePan={true}
                enableRotate={true}
                enableDamping={true} 
                dampingFactor={0.04}
                minDistance={15} 
                maxDistance={100}
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
                args={[2000, 2000]}
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
                            const heightVariation = j * (isMobile ? 4.5 : 3.8); 
                            const altOffset = isAlt ? 2.2 : 0;
                            const cardY = cardBaseY + heightVariation + altOffset;
                            
                            const randomXOffset = (task.id.charCodeAt(0) % 3 - 1) * 1.5; 
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
                {/* Bloom multi-camada para glow suave */}
                <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.2} radius={0.6} />
                <Noise opacity={0.03} />
                <Vignette eskil={false} offset={0.1} darkness={0.5} />
            </EffectComposer>
        </>
    );
};

export default TimelineScene;