const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebPackPlugin = require('html-webpack-plugin');
const { BannerPlugin } = require('webpack');
const ManifestPlugin = require('webpack-manifest-plugin');
const Dotenv = require('dotenv-webpack');
const createManifest = require('./manifest');

const getManifestPlugin = env => {
  const seed = createManifest(env);

  return new ManifestPlugin({
    fileName: 'manifest.json',
    seed,
    generate: seed => seed
  });
};

module.exports = env => {
  return {
    entry: {
      content: './src/ui/content-script.js',
      background: './src/background/index.js',
      options: './src/options/index.js'
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              rootMode: 'upward'
            }
          }
        },
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.png$/,
          loader: 'file-loader',
          options: {
            name: 'images/[name].[ext]'
          }
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          loader: 'file-loader',
          options: {
            name: 'assets/fonts/[name].[ext]'
          }
        },
        {
          test: /\.svg$/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                rootMode: 'upward'
              }
            },
            {
              loader: 'react-svg-loader',
              options: {
                jsx: true // true outputs JSX tags
              }
            }
          ]
        }
      ]
    },
    output: {
      path: path.resolve(__dirname, 'dist', env),
      globalObject: 'globalThis',
      // Webpack 4's default MD4 hash is disabled in Node 18/OpenSSL 3.
      hashFunction: 'sha256'
    },
    plugins: [
      getManifestPlugin(env),
      new Dotenv(),
      new CopyWebpackPlugin([
        { from: 'src/vendors', to: 'vendors' },
        { from: 'icons', to: 'icons' },
        { from: '_locales', to: '_locales' },
        { from: 'installed.png', to: 'installed.png' },
        ...(env === 'chromium' ? [{ from: 'src/offscreen', to: '.' }] : [])
      ]),
      ...(env === 'chromium'
        ? [
            new BannerPlugin({
              banner: "importScripts('vendors/browser-polyfill.js');",
              raw: true,
              entryOnly: true,
              include: /background\.js$/
            })
          ]
        : []),
      new HtmlWebPackPlugin({
        template: 'src/options/index.html',
        filename: 'options.html',
        browserPolyfill: 'vendors/browser-polyfill.js',
        chunks: ['options']
      })
    ]
  };
};
