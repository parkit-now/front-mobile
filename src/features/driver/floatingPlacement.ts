// Dónde va un panel flotante (desplegable, calendario, rueda de horas) respecto
// del campo que lo abre. Lógica pura, sin React Native: se prueba sola.
//
// Todo está en coordenadas de la capa flotante (la que dibuja los paneles).

export type Rect = { x: number; y: number; width: number; height: number };

/** Zona usable de la capa: descuenta barras del sistema, teclado y margen. */
export type Bounds = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type Side = 'below' | 'above';
export type Align = 'start' | 'end';

export type PlacementInput = {
  anchor: Rect;
  bounds: Bounds;
  /** Alto natural del contenido (ya topeado por el `maxHeight` del panel). */
  contentHeight: number;
  /** Ancho pedido: se achica si no entra en `bounds`. */
  width: number;
  /** Borde del campo con el que se alinea el panel. */
  align?: Align;
  /** Separación entre el campo y el panel. */
  gap?: number;
  /** Lado ya elegido: al crecer el contenido el panel no salta de lado. */
  side?: Side;
  /**
   * Alto mínimo útil: si no entra ni arriba ni abajo, el panel se superpone
   * al campo antes que quedar en una franja inservible.
   */
  minHeight?: number;
};

export type Placement = {
  side: Side;
  top: number;
  left: number;
  width: number;
  height: number;
};

export const FLOATING_GAP = 6;
export const FLOATING_MIN_HEIGHT = 120;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * Abajo del campo si entra; si no, arriba si entra; si no entra en ninguno,
 * del lado con más lugar y con scroll interno. Nunca se sale de `bounds`.
 */
export function placeFloating({
  anchor,
  bounds,
  contentHeight,
  width,
  align = 'start',
  gap = FLOATING_GAP,
  side: lockedSide,
  minHeight = FLOATING_MIN_HEIGHT,
}: PlacementInput): Placement {
  const boundsWidth = Math.max(0, bounds.right - bounds.left);
  const panelWidth = Math.min(width, boundsWidth);
  const preferredLeft =
    align === 'end' ? anchor.x + anchor.width - panelWidth : anchor.x;
  const left = clamp(preferredLeft, bounds.left, bounds.right - panelWidth);

  const anchorBottom = anchor.y + anchor.height;
  const spaceBelow = Math.max(0, bounds.bottom - anchorBottom - gap);
  const spaceAbove = Math.max(0, anchor.y - bounds.top - gap);
  const wanted = Math.max(0, contentHeight);

  const side: Side =
    lockedSide ??
    (wanted <= spaceBelow
      ? 'below'
      : wanted <= spaceAbove
        ? 'above'
        : spaceAbove > spaceBelow
          ? 'above'
          : 'below');
  const space = side === 'below' ? spaceBelow : spaceAbove;

  // Ni arriba ni abajo hay un alto útil (pantalla chica, teclado): el panel
  // se monta sobre el campo, dentro de la zona usable.
  if (space < Math.min(wanted, minHeight)) {
    const height = Math.min(wanted, Math.max(0, bounds.bottom - bounds.top));
    const preferredTop =
      side === 'below' ? anchorBottom + gap : anchor.y - gap - height;
    return {
      side,
      top: clamp(preferredTop, bounds.top, bounds.bottom - height),
      left,
      width: panelWidth,
      height,
    };
  }

  const height = Math.min(wanted, space);
  return {
    side,
    top: side === 'below' ? anchorBottom + gap : anchor.y - gap - height,
    left,
    width: panelWidth,
    height,
  };
}

/**
 * Zona usable de la capa: su propio rectángulo (medido en la ventana) menos
 * las barras del sistema, el teclado y un margen. Si la capa ya empieza debajo
 * de la barra de estado, el recorte de arriba es sólo el margen.
 */
export function floatingBounds({
  host,
  windowWidth,
  windowHeight,
  insets,
  keyboardHeight = 0,
  margin = 8,
}: {
  host: Rect;
  windowWidth: number;
  windowHeight: number;
  insets: { top: number; bottom: number; left: number; right: number };
  keyboardHeight?: number;
  margin?: number;
}): Bounds {
  const top = Math.max(0, insets.top - host.y) + margin;
  const visibleBottom = windowHeight - Math.max(insets.bottom, keyboardHeight);
  const bottom = Math.min(host.height, visibleBottom - host.y) - margin;
  const left = Math.max(0, insets.left - host.x) + margin;
  const right =
    Math.min(host.width, windowWidth - insets.right - host.x) - margin;
  return {
    top,
    bottom: Math.max(top, bottom),
    left,
    right: Math.max(left, right),
  };
}

/** El rectángulo del campo en coordenadas de la capa. */
export function relativeTo(rect: Rect, origin: Rect): Rect {
  return {
    x: rect.x - origin.x,
    y: rect.y - origin.y,
    width: rect.width,
    height: rect.height,
  };
}
