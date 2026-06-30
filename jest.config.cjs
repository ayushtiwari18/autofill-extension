/**
 * Jest Configuration (CommonJS .cjs)
 * Jest requires its config to be CommonJS when the project uses
 * "type": "module" in package.json. Using .cjs extension forces
 * Node to treat this as CommonJS regardless.
 */

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/unit/**/*.test.js'],
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  moduleFileExtensions: ['js', 'jsx'],
  collectCoverageFrom: [
    'src/engine/**/*.js',
    'src/utils/**/*.js',
    '!src/**/*.test.js'
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  verbose: true
};
