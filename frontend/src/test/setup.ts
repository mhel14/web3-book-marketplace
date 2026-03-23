import '@testing-library/jest-dom/vitest';

import { afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

beforeAll(() => {
  if (!URL.createObjectURL) {
    URL.createObjectURL = vi.fn(() => 'blob:preview-url');
  }

  if (!URL.revokeObjectURL) {
    URL.revokeObjectURL = vi.fn();
  }
});
