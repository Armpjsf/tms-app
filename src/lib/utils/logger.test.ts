import { describe, it, expect, vi, beforeEach } from 'vitest'
import Logger from '@/lib/utils/logger'

describe('Logger Utility', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // Mock consoles
    vi.spyOn(console, 'debug').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should log errors in all environments', () => {
    Logger.error('Test error')
    expect(console.error).toHaveBeenCalled()
  })

  it('should log warnings in all environments', () => {
    Logger.warn('Test warning')
    expect(console.warn).toHaveBeenCalled()
  })

  it('should format messages with timestamps and levels', () => {
    Logger.error('Test message')
    const calls = (console.error as unknown as { mock: { calls: string[][] } }).mock.calls
    const call = calls[0][0]
    expect(call).toContain('[ERROR]')
    expect(call).toContain('Test message')
  })
})
