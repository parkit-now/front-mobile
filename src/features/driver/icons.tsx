import Svg, { Circle, Path } from 'react-native-svg';

type IconName =
  | 'search'
  | 'calendar'
  | 'user'
  | 'car'
  | 'pin'
  | 'ticket'
  | 'filter'
  | 'bell'
  | 'plus'
  | 'minus'
  | 'arrow';

type Props = {
  name: IconName;
  color?: string;
  size?: number;
};

export function DriverIcon({ name, color = '#475467', size = 22 }: Props) {
  const common = {
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityRole="image"
    >
      {name === 'search' ? (
        <>
          <Circle cx="11" cy="11" r="7" {...common} />
          <Path d="M16.5 16.5L21 21" {...common} />
        </>
      ) : null}
      {name === 'calendar' ? (
        <>
          <Path
            d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
            {...common}
          />
        </>
      ) : null}
      {name === 'user' ? (
        <>
          <Circle cx="12" cy="8" r="4" {...common} />
          <Path d="M4 21a8 8 0 0 1 16 0" {...common} />
        </>
      ) : null}
      {name === 'car' ? (
        <>
          <Path
            d="M5 16h14M7 16l1.4-5.1A3 3 0 0 1 11.3 9h1.4a3 3 0 0 1 2.9 1.9L17 16M6 16v3M18 16v3"
            {...common}
          />
          <Circle cx="8" cy="19" r="1" fill={color} />
          <Circle cx="16" cy="19" r="1" fill={color} />
        </>
      ) : null}
      {name === 'pin' ? (
        <>
          <Path
            d="M12 21s7-5.1 7-11a7 7 0 1 0-14 0c0 5.9 7 11 7 11Z"
            {...common}
          />
          <Circle cx="12" cy="10" r="2.5" {...common} />
        </>
      ) : null}
      {name === 'ticket' ? (
        <>
          <Path
            d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z"
            {...common}
          />
          <Path d="M9 8v8" {...common} />
        </>
      ) : null}
      {name === 'filter' ? (
        <>
          <Path d="M4 7h10M18 7h2M4 17h2M10 17h10" {...common} />
          <Circle cx="16" cy="7" r="2" {...common} />
          <Circle cx="8" cy="17" r="2" {...common} />
        </>
      ) : null}
      {name === 'bell' ? (
        <>
          <Path
            d="M6 17h12l-1.5-2.5V10a4.5 4.5 0 0 0-9 0v4.5L6 17Z"
            {...common}
          />
          <Path d="M10 20h4" {...common} />
        </>
      ) : null}
      {name === 'plus' ? <Path d="M12 5v14M5 12h14" {...common} /> : null}
      {name === 'minus' ? <Path d="M5 12h14" {...common} /> : null}
      {name === 'arrow' ? <Path d="M5 12h14M13 6l6 6-6 6" {...common} /> : null}
    </Svg>
  );
}
