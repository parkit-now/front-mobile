import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { formatArs, PriceFilterSheet } from './PriceFilterSheet';

const BOUNDS = { min: 1000, max: 3000, step: 100 };

describe('PriceFilterSheet', () => {
  it('arranca en cualquier precio y cuenta todas las cocheras', () => {
    const onApply = vi.fn();
    render(
      <PriceFilterSheet
        bounds={BOUNDS}
        prices={[1000, 2000, 3000]}
        selected={null}
        onApply={onApply}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Cualquier precio')).toBeTruthy();
    expect(screen.getByText('3 de 3 cocheras')).toBeTruthy();
    fireEvent.click(screen.getByText('Ver 3 cocheras'));

    expect(onApply).toHaveBeenCalledWith(null);
  });

  it('conserva el máximo elegido y cuenta las que entran', () => {
    const onApply = vi.fn();
    render(
      <PriceFilterSheet
        bounds={BOUNDS}
        prices={[1000, 2000, 3000]}
        selected={2000}
        onApply={onApply}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Hasta $2.000')).toBeTruthy();
    expect(screen.getByText('2 de 3 cocheras')).toBeTruthy();
    fireEvent.click(screen.getByText('Ver 2 cocheras'));

    expect(onApply).toHaveBeenCalledWith(2000);
  });

  it('limpia el filtro', () => {
    const onApply = vi.fn();
    render(
      <PriceFilterSheet
        bounds={BOUNDS}
        prices={[1000, 3000]}
        selected={1000}
        onApply={onApply}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Limpiar'));

    expect(onApply).toHaveBeenCalledWith(null);
  });

  it('explica que no hay nada para filtrar si los precios son iguales', () => {
    render(
      <PriceFilterSheet
        bounds={null}
        prices={[1500]}
        selected={null}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(/tienen el mismo precio/)).toBeTruthy();
    expect(screen.getByText('Ver 1 cochera')).toBeTruthy();
  });

  it('se cierra desde el encabezado de la hoja', () => {
    const onClose = vi.fn();
    render(
      <PriceFilterSheet
        bounds={BOUNDS}
        prices={[1000]}
        selected={null}
        onApply={vi.fn()}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByLabelText('Cerrar precio máximo por hora'));

    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('formatArs', () => {
  it('formatea pesos con separador de miles argentino', () => {
    expect(formatArs(12500)).toBe('$12.500');
  });
});
