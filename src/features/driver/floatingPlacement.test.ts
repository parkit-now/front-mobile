import { describe, expect, it } from 'vitest';
import {
  FLOATING_GAP,
  floatingBounds,
  placeFloating,
  relativeTo,
  type Bounds,
} from './floatingPlacement';

// Pantalla de 390 × 844 con 8 px de margen.
const bounds: Bounds = { top: 8, bottom: 836, left: 8, right: 382 };
const field = { x: 48, y: 200, width: 294, height: 64 };

describe('placeFloating', () => {
  it('abre abajo del campo, con su ancho, si el contenido entra', () => {
    const placement = placeFloating({
      anchor: field,
      bounds,
      contentHeight: 300,
      width: field.width,
    });
    expect(placement).toEqual({
      side: 'below',
      top: 200 + 64 + FLOATING_GAP,
      left: 48,
      width: 294,
      height: 300,
    });
  });

  it('se da vuelta y abre arriba si abajo no entra', () => {
    const nearBottom = { ...field, y: 600 };
    const placement = placeFloating({
      anchor: nearBottom,
      bounds,
      contentHeight: 300,
      width: field.width,
    });
    expect(placement.side).toBe('above');
    expect(placement.height).toBe(300);
    // El borde de abajo del panel queda pegado al campo.
    expect(placement.top + placement.height).toBe(600 - FLOATING_GAP);
  });

  it('si no entra en ningún lado usa el de más lugar y recorta el alto', () => {
    const small: Bounds = { top: 8, bottom: 632, left: 8, right: 352 };
    const middle = { x: 24, y: 300, width: 312, height: 64 };
    const placement = placeFloating({
      anchor: middle,
      bounds: small,
      contentHeight: 500,
      width: 312,
    });
    // Arriba: 300 - 8 - 6 = 286; abajo: 632 - 364 - 6 = 262.
    expect(placement.side).toBe('above');
    expect(placement.height).toBe(286);
    expect(placement.top).toBe(8);
  });

  it('nunca se sale por los costados y se achica si es más ancho que la zona', () => {
    const rightEdge = { x: 300, y: 200, width: 74, height: 40 };
    const placement = placeFloating({
      anchor: rightEdge,
      bounds,
      contentHeight: 100,
      width: 300,
    });
    expect(placement.left).toBe(382 - 300);
    expect(placement.left + placement.width).toBeLessThanOrEqual(382);

    const tooWide = placeFloating({
      anchor: field,
      bounds,
      contentHeight: 100,
      width: 1000,
    });
    expect(tooWide.width).toBe(374);
    expect(tooWide.left).toBe(8);
  });

  it('align end alinea el borde derecho del panel con el del campo', () => {
    const placement = placeFloating({
      anchor: field,
      bounds,
      contentHeight: 200,
      width: 180,
      align: 'end',
    });
    expect(placement.left + placement.width).toBe(field.x + field.width);
  });

  it('respeta el lado ya elegido aunque el contenido crezca', () => {
    const placement = placeFloating({
      anchor: field,
      bounds,
      contentHeight: 150,
      width: 294,
      side: 'above',
    });
    expect(placement.side).toBe('above');
    expect(placement.top + placement.height).toBe(200 - FLOATING_GAP);
  });

  it('sin un alto útil en ningún lado, se superpone al campo sin salir de la zona', () => {
    const tiny: Bounds = { top: 8, bottom: 260, left: 8, right: 382 };
    const middle = { x: 48, y: 110, width: 294, height: 64 };
    const placement = placeFloating({
      anchor: middle,
      bounds: tiny,
      contentHeight: 250,
      width: 294,
    });
    expect(placement.height).toBe(250);
    expect(placement.top).toBeGreaterThanOrEqual(8);
    expect(placement.top + placement.height).toBeLessThanOrEqual(260);
  });
});

describe('floatingBounds', () => {
  const insets = { top: 47, bottom: 34, left: 0, right: 0 };

  it('descuenta barras del sistema y margen si la capa ocupa la ventana', () => {
    expect(
      floatingBounds({
        host: { x: 0, y: 0, width: 390, height: 844 },
        windowWidth: 390,
        windowHeight: 844,
        insets,
      }),
    ).toEqual({ top: 55, bottom: 802, left: 8, right: 382 });
  });

  it('el teclado achica la zona de abajo', () => {
    const result = floatingBounds({
      host: { x: 0, y: 0, width: 390, height: 844 },
      windowWidth: 390,
      windowHeight: 844,
      insets,
      keyboardHeight: 300,
    });
    expect(result.bottom).toBe(844 - 300 - 8);
  });

  it('si la capa ya empieza debajo de la barra, sólo resta el margen', () => {
    const result = floatingBounds({
      host: { x: 0, y: 60, width: 390, height: 700 },
      windowWidth: 390,
      windowHeight: 844,
      insets,
    });
    expect(result.top).toBe(8);
    expect(result.bottom).toBe(692);
  });
});

describe('relativeTo', () => {
  it('pasa del sistema de la ventana al de la capa', () => {
    expect(
      relativeTo(
        { x: 40, y: 300, width: 100, height: 50 },
        { x: 0, y: 24, width: 390, height: 820 },
      ),
    ).toEqual({ x: 40, y: 276, width: 100, height: 50 });
  });
});
