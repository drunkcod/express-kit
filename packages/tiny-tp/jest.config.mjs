import { makeEsmPreset } from '@drunkcod/ts-jest-esm';

export default makeEsmPreset({
  ignorePatterns: ['lib'],
  'ts-jest': {
    isolatedModules: true,
  },
});
