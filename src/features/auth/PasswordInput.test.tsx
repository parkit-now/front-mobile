import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PasswordInput } from './PasswordInput';

describe('PasswordInput', () => {
  it('oculta la contraseña hasta tocar el botón', () => {
    render(<PasswordInput placeholder="Contraseña" />);

    const input = screen.getByPlaceholderText('Contraseña');
    expect(input.getAttribute('type')).toBe('password');

    fireEvent.click(screen.getByLabelText('Mostrar contraseña'));

    expect(input.getAttribute('type')).not.toBe('password');
    expect(screen.getByLabelText('Ocultar contraseña')).toBeTruthy();
  });

  it('avisa los cambios de texto', () => {
    const onChangeText = vi.fn();
    render(
      <PasswordInput placeholder="Contraseña" onChangeText={onChangeText} />,
    );

    fireEvent.change(screen.getByPlaceholderText('Contraseña'), {
      target: { value: 'secreto123' },
    });

    expect(onChangeText).toHaveBeenCalledWith('secreto123');
  });

  it('en modo "new" sugiere autocompletar una contraseña nueva', () => {
    render(<PasswordInput placeholder="Nueva" mode="new" />);

    expect(
      screen.getByPlaceholderText('Nueva').getAttribute('autocomplete'),
    ).toBe('new-password');
  });
});
