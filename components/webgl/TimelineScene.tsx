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

// Hook para detectar tamanho de tela e ajustar layout 3D
const useResponsiveLayout = () => {
    const { size } = useThree();
    const width = size.width;
    
    // Lógica de Breakpoints (Valores aproximados para Canvas 3D)
    // < 600px geralmente é mobile portrait
    const isMobile = width < 600;
    
    return {
        isMobile,
        // No mobile, aproximamos os cards (X) e diminuímos a altura (Y)
        cardSpacingX: isMobile ? 4.5 : 8, 
        cardBaseY: isMobile ? 2.5 : 3.5,
        // Câmera se afasta no mobile para caber mais coisas na tela estreita
        zoomDistance: isMobile ? 28 : 22, 
        particleCount: isMobile ? 60 : 250 // Otimização de performance
    };
};

// Marcador de Dia Simples
const DayMarker: React.FC<{ position: THREE.Vector3, label: string }> = ({ position, label }) => (
    <Text
        position={[position.x, -2.5, position.z]}
        fontSize={0.45}
        color="#94a3b8" // Slate 400
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
    
    // Usa o hook de responsividade
    const { isMobile, cardSpacingX, cardBaseY, zoomDistance, particleCount } = useResponsiveLayout();
    const { camera } = useThree();
    
    const [draggingTask, setDraggingTask] = useState<Task | null>(null);
    const planeRef = useRef<THREE.Mesh>(null);
    const dragOffset = useRef(new THREE.Vector3()); 
    const groupRefs = useRef(new Map<string, THREE.Group>());

    // Atualiza a câmera quando o dispositivo muda
    useEffect(() => {
        camera.position.set(0, 4, zoomDistance);
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

    // --- Drag Logic (Simplificada) ---
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
            // Mantém o card acima do chão (Y > 1.5)
            cardGroup.position.set(intersection.x, Math.max(intersection.y, 1.5), 0);
        }
    };

    const handleDragEnd = (e: ThreeEvent<PointerEvent>) => {
        if (!draggingTask) return;
        e.stopPropagation();
        const cardGroup = groupRefs.current.get(draggingTask.id);
        if (cardGroup) {
            // Snap to nearest date
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
            {/* ILUMINAÇÃO REFORÇADA (Fim da Escuridão) */}
            <ambientLight intensity={0.3} /> {/* Aumentado de 0.1 para 0.3 */}
            <pointLight position={[0, 10, 10]} intensity={2.5} color="#e9d5ff" distance={50} decay={2} />
            <pointLight position={[-20, 5, 0]} intensity={1.5} color="#c084fc" distance={40} decay={2} />
            <pointLight position={[20, 5, 0]} intensity={1.5} color="#818cf8" distance={40} decay={2} />

            {/* Partículas de Fundo */}
            <FloatingParticles count={particleCount} range={70} />

            <OrbitControls 
                enableZoom={true}
                enablePan={true}
                enableRotate={true}
                // Limites para evitar bugs visuais e "olhar o vazio"
                maxPolarAngle={Math.PI / 2 - 0.1} // Não deixa ir abaixo do chão
                minPolarAngle={0.2}
                minDistance={10} // Impede chegar muito perto (evita flickering/clipping)
                maxDistance={60}
                mouseButtons={{
                    LEFT: THREE.MOUSE.PAN,    // Pan é melhor como padrão em timelines
                    MIDDLE: THREE.MOUSE.DOLLY, // Zoom
                    RIGHT: THREE.MOUSE.ROTATE  // Rotação
                }}
            />
            
            {/* O Novo Rio de Energia */}
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
                            // Lógica de Layout Inteligente
                            const isAlt = j % 2 !== 0;
                            // Mais variação vertical para evitar sobreposição
                            const heightVariation = j * (isMobile ? 3.2 : 2.8); 
                            const altOffset = isAlt ? 1.2 : 0;
                            
                            const cardY = cardBaseY + heightVariation + altOffset;
                            
                            // Espalha levemente no eixo X para não ficar uma fila indiana perfeita
                            const randomXOffset = (task.id.charCodeAt(0) % 3 - 1) * 0.5; 
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
                                        scale={isMobile ? 0.8 : 1}
                                    />
                                    {/* Conector do Rio para o Card */}
                                    <TimelineBranch start={nodePos} end={pos} color={color} />
                                </group>
                            );
                        })}
                    </group>
                );
            })}

            {/* Pós-Processamento Suavizado */}
            <EffectComposer disableNormalPass>
                {/* Bloom com threshold mais baixo para pegar o brilho do feixe */}
                <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.2} radius={0.6} />
                <Noise opacity={0.03} />
                <Vignette eskil={false} offset={0.1} darkness={0.5} />
            </EffectComposer>
        </>
    );
};

export default TimelineScene;