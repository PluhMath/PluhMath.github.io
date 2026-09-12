const path = require('path');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin')

function resolve (dir) {
  return path.join(__dirname, '..', dir)
}
const webpackConfigs = {
  entry: {
    app: ['./main.js'],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    //publicPath: '',
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        query: {
          plugins: ['transform-runtime'],
          presets: [['es2015', {'modules': false}]],
        },
      },
      {
        test: /\.less$/,
        use: ExtractTextPlugin.extract({
          fallback: "style-loader",
          use: [
            'css-loader',
            'less-loader'
          ],
          // publicPath: "/dist",
        }),
      },
      {
        test: /\.css/,
        use: ExtractTextPlugin.extract({
          fallback: "style-loader",
          use: [
            'css-loader',
          ],
          // publicPath: "/dist",
        }),
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'index.html',
      inject: true
    }),
    new ExtractTextPlugin({
      filename: '[name].css',
      allChunks: true
    })
  ],
};

module.exports = webpackConfigs;
