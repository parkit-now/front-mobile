import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { driverColors, ticketColors } from '../../theme';

// Íconos de línea del prototipo (16×16, trazo 1,5). Decorativos: el texto de al
// lado ya dice lo mismo (un <Svg> sin rol no lo anuncia el lector de pantalla).

export type MotionIconName =
  | 'paid'
  | 'refund'
  | 'clock'
  | 'bell'
  | 'shield'
  | 'qr'
  | 'message'
  | 'card'
  | 'pin'
  | 'check'
  | 'info';

type Props = { name: MotionIconName; size?: number; color?: string };

export function MotionIcon({ name, size = 15, color }: Props) {
  const stroke = color ?? ticketColors.label;
  const common = {
    fill: 'none',
    stroke,
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      {name === 'paid' ? (
        <>
          <Circle cx="8" cy="8" r="7" fill={driverColors.success} />
          <Path
            d="M5 8.2l2 2 4-4.2"
            fill="none"
            stroke="#fff"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : null}
      {name === 'refund' ? (
        <>
          <Path d="M13.3 8a5.3 5.3 0 1 1-1.6-3.9" {...common} />
          <Path d="M12.3 1.6v2.8H9.5" {...common} />
        </>
      ) : null}
      {name === 'clock' ? (
        <>
          <Circle cx="8" cy="8" r="6.3" {...common} />
          <Path d="M8 4.8V8l2.2 1.4" {...common} />
        </>
      ) : null}
      {name === 'bell' ? (
        <>
          <Path
            d="M4.2 11.5V7.3a3.8 3.8 0 0 1 7.6 0v4.2l1.2 1.2H3l1.2-1.2Z"
            {...common}
          />
          <Path d="M6.6 14.2a1.5 1.5 0 0 0 2.8 0" {...common} />
        </>
      ) : null}
      {name === 'shield' ? (
        <>
          <Path
            d="M8 1.6 13.2 3.6v4c0 3.2-2.2 5.5-5.2 6.8C5 13.1 2.8 10.8 2.8 7.6v-4L8 1.6Z"
            {...common}
          />
          <Path d="m5.6 7.9 1.7 1.7 3.2-3.3" {...common} />
        </>
      ) : null}
      {name === 'qr' ? (
        <>
          <Rect x="2.2" y="2.2" width="4.6" height="4.6" rx="1" {...common} />
          <Rect x="9.2" y="2.2" width="4.6" height="4.6" rx="1" {...common} />
          <Rect x="2.2" y="9.2" width="4.6" height="4.6" rx="1" {...common} />
          <Path d="M9.5 9.5h1.5v1.5M13.5 9.5v4h-4" {...common} />
        </>
      ) : null}
      {name === 'message' ? (
        <Path d="M2.5 3.5h11v7.2H8.4L5.3 13v-2.3H2.5V3.5Z" {...common} />
      ) : null}
      {name === 'card' ? (
        <>
          <Rect x="1.8" y="3.5" width="12.4" height="9" rx="1.8" {...common} />
          <Path d="M1.8 6.6h12.4" {...common} />
        </>
      ) : null}
      {name === 'pin' ? (
        <>
          <Path
            d="M8 14.4s4.6-4.1 4.6-7.8a4.6 4.6 0 0 0-9.2 0c0 3.7 4.6 7.8 4.6 7.8Z"
            {...common}
          />
          <Circle cx="8" cy="6.6" r="1.6" {...common} />
        </>
      ) : null}
      {name === 'check' ? (
        <>
          <Circle cx="8" cy="8" r="6.4" {...common} />
          <Path d="m5.5 8.2 1.7 1.7 3.4-3.5" {...common} />
        </>
      ) : null}
      {name === 'info' ? (
        <>
          <Circle cx="8" cy="8" r="6.4" {...common} />
          <Path d="M8 7.3v3.7" {...common} />
          <Circle cx="8" cy="5" r="0.6" fill={stroke} />
        </>
      ) : null}
    </Svg>
  );
}
