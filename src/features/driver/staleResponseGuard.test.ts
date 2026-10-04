import { describe, expect, it } from 'vitest';
import { createStaleResponseGuard } from './staleResponseGuard';

describe('createStaleResponseGuard', () => {
  it('acepta una lectura sin escrituras de por medio', () => {
    const guard = createStaleResponseGuard();
    const ticket = guard.beginRead('r1');
    expect(guard.canApply('r1', ticket)).toBe(true);
  });

  it('descarta una lectura iniciada antes de una escritura terminada', () => {
    const guard = createStaleResponseGuard();
    const ticket = guard.beginRead('r1');
    guard.beginWrite('r1');
    guard.endWrite('r1');
    expect(guard.canApply('r1', ticket)).toBe(false);
  });

  it('descarta lecturas mientras la escritura sigue en curso', () => {
    const guard = createStaleResponseGuard();
    guard.beginWrite('r1');
    const ticket = guard.beginRead('r1');
    expect(guard.canApply('r1', ticket)).toBe(false);
    expect(guard.hasPendingWrites()).toBe(true);
  });

  it('acepta lecturas nuevas después de la escritura y no mezcla reservas', () => {
    const guard = createStaleResponseGuard();
    const other = guard.beginRead('r2');
    guard.beginWrite('r1');
    guard.endWrite('r1');
    const fresh = guard.beginRead('r1');
    expect(guard.canApply('r1', fresh)).toBe(true);
    expect(guard.canApply('r2', other)).toBe(true);
    expect(guard.hasPendingWrites()).toBe(false);
  });
});
