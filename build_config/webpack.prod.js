const { mergeWithRules } = require("webpack-merge");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

const commonConfig = require("./webpack.common.js");

const prodConfig = {
  mode: "production",
  devtool: false,
  optimization: {
    emitOnErrors: false,
    minimizer: [
      new TerserPlugin(),
      new CssMinimizerPlugin()
    ],
    splitChunks: {
      automaticNameDelimiter: "-",
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
              postcssOptions: {
                plugins: [
                  "autoprefixer",
                  "postcss-custom-properties",
                  "postcss-nested",
                  "postcss-preset-env"
                ]
              }
            }
          }
        ]
      }
    ]
  }
};

module.exports = mergeWithRules({
  output: "append",
  plugins: "prepend",
  module: {
    rules: {
      test: "match",
      use: "replace"
    }
  }
})(commonConfig, prodConfig);
