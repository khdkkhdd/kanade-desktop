import { describe, it, expect } from 'vitest';
import { shouldInterceptClick } from './click-interceptor.js';

describe('shouldInterceptClick', () => {
  it('intercepts youtube watch links', () => {
    expect(shouldInterceptClick('https://www.youtube.com/watch?v=abc123')).toBe(true);
  });
  it('intercepts youtube channel/search', () => {
    expect(shouldInterceptClick('https://www.youtube.com/c/Foo')).toBe(true);
    expect(shouldInterceptClick('https://www.youtube.com/results?search_query=x')).toBe(true);
  });
  it('does not intercept external domains (those go via shell.openExternal handler)', () => {
    expect(shouldInterceptClick('https://example.com/')).toBe(false);
  });
  it('does not intercept current synced URL', () => {
    expect(shouldInterceptClick('https://www.youtube.com/watch?v=abc', 'abc')).toBe(false);
  });
});
