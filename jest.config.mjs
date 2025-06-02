import { makeEsmPreset } from '@drunkcod/ts-jest-esm';

export default makeEsmPreset({
  ignorePatterns: ['lib', 'express-async'],
  'ts-jest': {
    isolatedModules: true,
  },
});
