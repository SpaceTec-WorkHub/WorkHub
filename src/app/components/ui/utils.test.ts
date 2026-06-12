import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('combina clases simples', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('omite valores falsy', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b')
  })

  it('resuelve clases de Tailwind en conflicto, dejando la última', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })
})
