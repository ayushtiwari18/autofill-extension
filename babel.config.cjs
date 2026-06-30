/**
 * Babel Configuration (CommonJS .cjs)
 * Must be .cjs because package.json has "type": "module".
 * This config is shared between Webpack (via webpack.config.cjs)
 * and Jest (via jest.config.cjs).
 */

module.exports = {
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
