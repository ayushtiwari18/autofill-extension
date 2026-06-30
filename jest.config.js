/**
 * Jest Configuration
 * Only runs unit tests — no Chrome API needed.
 * Engine files (confidence.js, mapper.js, rules.js, validators.js) are pure JS.
 */

export default {
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
