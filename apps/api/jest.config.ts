export default {
  displayName: 'api',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  moduleNameMapper: {
    '^@task-mgmt/data$': '<rootDir>/../../libs/data/src/index.ts',
    '^@task-mgmt/auth$': '<rootDir>/../../libs/auth/src/index.ts',
  },
  coverageDirectory: '../../coverage/apps/api',
};
