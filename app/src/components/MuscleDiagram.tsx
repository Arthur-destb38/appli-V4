import React from 'react';
import Svg, { Circle, Rect } from 'react-native-svg';

type DiagramProps = {
  muscleGroup?: string | null;
  accentColor?: string;
};

type AreaKey =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'abs'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves'
  | 'neck';

const AREA_RECTS: Record<AreaKey, { x: number; y: number; width: number; height: number }> = {
  neck: { x: 88, y: 20, width: 24, height: 18 },
  shoulders: { x: 55, y: 38, width: 90, height: 22 },
  chest: { x: 65, y: 60, width: 70, height: 32 },
  arms: { x: 35, y: 60, width: 24, height: 70 }, // mirrored manually in render
  abs: { x: 70, y: 92, width: 60, height: 38 },
  glutes: { x: 70, y: 130, width: 60, height: 30 },
  quads: { x: 65, y: 160, width: 35, height: 50 }, // mirrored
  hamstrings: { x: 65, y: 210, width: 35, height: 40 }, // mirrored
  calves: { x: 65, y: 250, width: 30, height: 30 }, // mirrored
  back: { x: 65, y: 60, width: 70, height: 40 },
};

const GROUP_TO_AREAS: Record<string, AreaKey[]> = {
  chest: ['chest'],
  pectoraux: ['chest'],
  'upper pectorals': ['chest'],
  shoulders: ['shoulders'],
  'rear delts': ['shoulders'],
  trapèzes: ['shoulders', 'neck'],
  traps: ['shoulders', 'neck'],
  biceps: ['arms'],
  triceps: ['arms'],
  'avant-bras': ['arms'],
  forearms: ['arms'],
  lats: ['back'],
  'grand dorsal': ['back'],
  back: ['back'],
  'milieu du dos': ['back'],
  'bas du dos': ['back'],
  dorsaux: ['back'],
  core: ['abs'],
  abdominaux: ['abs'],
  'lower back': ['back'],
  hamstrings: ['hamstrings'],
  'ischio-jambiers': ['hamstrings'],
  glutes: ['glutes'],
  fessiers: ['glutes'],
  quadriceps: ['quads'],
  quads: ['quads'],
  calves: ['calves'],
  mollets: ['calves'],
};

const normalize = (value?: string | null) => (value ?? '').toLowerCase().trim();

const getAreasForGroup = (group?: string | null): AreaKey[] => {
  const normalized = normalize(group);
  if (!normalized) {
    return [];
  }
  return GROUP_TO_AREAS[normalized] ?? [];
};

export const MuscleDiagram: React.FC<DiagramProps> = ({ muscleGroup, accentColor = '#0EA5E9' }) => {
  const areas = getAreasForGroup(muscleGroup);

  const highlightRects = areas.flatMap((area) => {
    const data = AREA_RECTS[area];
    if (!data) {
      return [];
    }
    if (['arms', 'quads', 'hamstrings', 'calves'].includes(area)) {
      // render mirrored shapes for limbs
      return [
        <Rect key={`${area}-left`} {...data} fill={accentColor} opacity={0.8} rx={10} />,
        <Rect
          key={`${area}-right`}
          x={200 - data.x - data.width}
          y={data.y}
          width={data.width}
          height={data.height}
          fill={accentColor}
          opacity={0.8}
          rx={10}
        />,
      ];
    }
    return [<Rect key={area} {...data} fill={accentColor} opacity={0.8} rx={12} />];
  });

  return (
    <Svg width={200} height={300} viewBox="0 0 200 300">
      <Circle cx={100} cy={15} r={15} fill="#1f2937" opacity={0.6} />
      <Rect x={85} y={30} width={30} height={20} fill="#1f2937" opacity={0.6} rx={8} />
      <Rect x={70} y={50} width={60} height={110} fill="#1f2937" opacity={0.4} rx={20} />
      <Rect x={40} y={60} width={30} height={90} fill="#1f2937" opacity={0.4} rx={20} />
      <Rect x={130} y={60} width={30} height={90} fill="#1f2937" opacity={0.4} rx={20} />
      <Rect x={70} y={160} width={25} height={120} fill="#1f2937" opacity={0.4} rx={20} />
      <Rect x={105} y={160} width={25} height={120} fill="#1f2937" opacity={0.4} rx={20} />
      {highlightRects}
    </Svg>
  );
};

export default MuscleDiagram;
