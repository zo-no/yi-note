const merge = require('webpack-merge');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const FileManagerPlugin = require('filemanager-webpack-plugin');
const common = require('./webpack.common');
const pkg = require('./package.json');

module.exports = env =>
  merge(common(env), {
    mode: 'production',
    optimization: {
      minimize: false, // Evernote SDK has issue when code is minifized
      // Webpack 4's concatenation hashes use MD4, ignoring output.hashFunction.
      // Disable this optimization so Node 18+ does not need legacy OpenSSL.
      concatenateModules: false
    },
    plugins: [
      new CleanWebpackPlugin(),
      new FileManagerPlugin({
        onEnd: [
          { mkdir: ['../../artifactory'] },
          {
            archive: [
              {
                source: `dist/${env}`,
                destination: `../../artifactory/yi-note-extension_${env}_${pkg.version}.zip`
              }
            ]
          }
        ]
      })
    ]
  });
