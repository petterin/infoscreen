const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const LodashModuleReplacementPlugin = require('lodash-webpack-plugin');

module.exports = {
  mode: "none",
  entry: {
    app: "./client/index.jsx"
  },
  output: {
    filename: "[name]-bundle.js",
    chunkFilename: "[name]-chunk.js",
    path: path.resolve(__dirname, "../public/assets"),
    publicPath: "/assets/"
  },
  resolve: {
    extensions: [".js", ".jsx", ".json"]
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        include: path.resolve(__dirname, "../client"),
        loader: "babel-loader",
        sideEffects: false,
        options: {
          cacheDirectory: true
        }
      },
      {
        test: /\.css$/,
        use: [
          { loader: "style-loader" },
          { loader: "css-loader", options: { importLoaders: 1 } },
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                plugins: [
                  'autoprefixer',
                  'postcss-custom-properties',
                  'postcss-nested',
                  'postcss-preset-env'
                ]
              }
            }
          }
        ]
      },
      {
        test: /\.(woff|woff2|eot|ttf|svg)(\?|$)/,
        type: "asset/resource",
        generator: {
          filename: "font/[name]-[hash:10][ext]"
        }
      }
    ]
  },
  plugins: [
    new LodashModuleReplacementPlugin({
      paths: true,
      shorthands: true
    }),
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: [
        "**/*",
        path.join(process.cwd(), "views/*.generated.ejs")
      ],
      verbose: true,
      watch: false
    }),
    // Generate the index page inside the Node app's "views" directory
    new HtmlWebpackPlugin({
      template: "!!raw-loader!views/app.template.ejs",
      filename: "../../views/app.generated.ejs",
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        conservativeCollapse: true,
        preserveLineBreaks: true
      }
    })
  ]
};
