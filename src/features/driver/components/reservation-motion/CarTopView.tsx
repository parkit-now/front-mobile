import { useId } from 'react';
import Svg, {
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

type Props = {
  width: number;
  height: number;
  /** Gris: reserva pasada. */
  muted?: boolean;
};

const BLUE = {
  bodyEdge: '#0a4bb4',
  bodyMid: '#2479f0',
  roofTop: '#3b8cf6',
  roofBottom: '#1c6fe6',
  mirror: '#0b3f91',
};
const GRAY = {
  bodyEdge: '#98a2b3',
  bodyMid: '#c0c7d2',
  roofTop: '#cfd5de',
  roofBottom: '#b3bbc7',
  mirror: '#8a94a6',
};

/**
 * Autito visto desde arriba, mirando a la izquierda (entra al lugar de frente).
 * Es el símbolo `car-top` del prototipo (40×72) girado -90°.
 */
export function CarTopView({ width, height, muted = false }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const c = muted ? GRAY : BLUE;
  const glass = muted ? '#6b7584' : '#0b2557';
  const glassBottom = muted ? '#7d8796' : '#14366f';
  return (
    <Svg width={width} height={height} viewBox="0 0 72 40">
      <Defs>
        <LinearGradient id={`body${id}`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={c.bodyEdge} />
          <Stop offset="0.5" stopColor={c.bodyMid} />
          <Stop offset="1" stopColor={c.bodyEdge} />
        </LinearGradient>
        <LinearGradient id={`roof${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.roofTop} />
          <Stop offset="1" stopColor={c.roofBottom} />
        </LinearGradient>
        <LinearGradient id={`glass${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={glass} />
          <Stop offset="1" stopColor={glassBottom} />
        </LinearGradient>
      </Defs>
      <G transform="translate(0 40) rotate(-90)">
        <Ellipse cx="2.6" cy="22.5" rx="2.4" ry="1.6" fill={c.mirror} />
        <Ellipse cx="37.4" cy="22.5" rx="2.4" ry="1.6" fill={c.mirror} />
        <Rect
          x="3"
          y="1.5"
          width="34"
          height="69"
          rx="13"
          fill={`url(#body${id})`}
        />
        <Path
          d="M8.2 19.5 Q20 15.2 31.8 19.5 L29.4 29.4 Q20 27.6 10.6 29.4 Z"
          fill={`url(#glass${id})`}
        />
        <Rect
          x="10.4"
          y="30.6"
          width="19.2"
          height="20.6"
          rx="4.5"
          fill={`url(#roof${id})`}
        />
        <Path
          d="M10.6 52.6 Q20 54.2 29.4 52.6 L30.8 60.8 Q20 63 9.2 60.8 Z"
          fill={`url(#glass${id})`}
          opacity={0.92}
        />
        <Rect x="7" y="3.4" width="7" height="2.4" rx="1.2" fill="#eaf2ff" />
        <Rect x="26" y="3.4" width="7" height="2.4" rx="1.2" fill="#eaf2ff" />
        <Rect
          x="7.5"
          y="66.6"
          width="6"
          height="2"
          rx="1"
          fill={muted ? '#c0c7d2' : '#ff8f8f'}
          opacity={0.85}
        />
        <Rect
          x="26.5"
          y="66.6"
          width="6"
          height="2"
          rx="1"
          fill={muted ? '#c0c7d2' : '#ff8f8f'}
          opacity={0.85}
        />
      </G>
    </Svg>
  );
}
