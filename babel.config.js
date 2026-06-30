/**
 * Babel Configuration
 * Shared between Webpack (for extension build) and Jest (for tests).
 * Handles JSX, ES modules, and modern JS syntax.
 */

export default {
  presets: [
    ['@babel/preset-env', {
      targets: { node: 'current' },
      modules: 'auto'
    }],
    ['@babel/preset-react', {
      runtime: 'automatic'
    }]
  ]
};
