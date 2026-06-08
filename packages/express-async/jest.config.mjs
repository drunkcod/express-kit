export default {
  rootDir: 'src',
  transform: {
    '^.+\\.[tj]s$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'typescript',
          },
        },
      },
    ],
  },
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
