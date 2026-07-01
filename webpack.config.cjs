/**
 * Webpack Configuration (CommonJS)
 * Renamed from webpack.config.js to webpack.config.cjs because
 * package.json has "type": "module", which makes .js files ES modules.
 * Webpack config MUST be CommonJS (require/module.exports), so .cjs extension
 * forces Node to treat this as CommonJS regardless of package.json.
 */

const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    popup: './src/index.js',
    background: './src/background/serviceWorker.js',
    content: './src/content/scanner.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              ['@babel/preset-react', { runtime: 'automatic' }]
            ]
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx']
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'public',                    to: 'public'   },
        { from: 'manifest.json',             to: 'manifest.json' },
        // Options page — plain HTML/CSS/JS, no bundling needed
        { from: 'src/options',               to: 'options'  },
        // IDB + schema modules used by options.js at runtime
        { from: 'src/storage',               to: 'storage'  },
        // Fingerprint engine (used by content script at runtime)
        { from: 'src/engine',                to: 'engine'   },
        // Tooltip stylesheet — must be web-accessible for content script injection
        { from: 'src/content/tooltip.css',   to: 'content/tooltip.css' },
      ]
    })
  ],
  devtool: 'cheap-module-source-map'
};
