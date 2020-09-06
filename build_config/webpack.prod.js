const merge = require("webpack-merge");
const autoprefixer = require("autoprefixer");
const postCSSCustomProperties = require("postcss-custom-properties");
const postcssNested = require("postcss-nested");
const postcssPresetEnv = require("postcss-preset-env");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

const commonConfig = require("./webpack.common.js");

module.exports = merge.smart(commonConfig, {
  mode: "production",
  optimization: {
    noEmitOnErrors: true,
    minimizer: [
      new TerserPlugin({
        cache: true,
        parallel: true,
        sourceMap: true
      }),
      new OptimizeCSSAssetsPlugin({})
    ],
    splitChunks: {
      automaticNameDelimiter: '-',
      chunks: "async"
    }
  },
  output: {
    filename: "[name].[chunkhash].js",
    chunkFilename: "[name].[chunkhash].js"
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "[name].[contenthash].css",
      chunkFilename: "[name].[contenthash].css"
    })
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          { loader: "css-loader", options: { importLoaders: 1 } },
          {
            loader: "postcss-loader",
            options: {
              ident: "postcss",
              plugins: () => [
                autoprefixer(),
                postCSSCustomProperties(),
                postcssNested(),
                postcssPresetEnv()
              ]
            }
          }
        ]
      }
    ]
  }
});
