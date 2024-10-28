
import { makeEsmPreset } from '@drunkcod/ts-jest-esm';

export default makeEsmPreset({ ignorePatterns: ['express-async'] });