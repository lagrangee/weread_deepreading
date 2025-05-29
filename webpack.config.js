const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';

  // 开发模式提示
  if (isDevelopment) {
    console.log('🔧 开发模式启动，文件变化时会自动重新构建');
    console.log('📝 构建完成后，请在 Chrome 扩展页面刷新扩展');
  }

  // 创建两个独立的配置，一个用于 JS，一个用于 CSS
  return [
    // JS 配置
    {
      mode: argv.mode || 'development',
      devtool: isDevelopment ? 'inline-source-map' : false,
      entry: {
        content: './src/content/content.js',
        background: './src/background/background.js',
        popup: './src/popup/popup.js'
      },
      output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].bundle.js',
        clean: true,
        // 为 service worker 环境配置
        environment: {
          dynamicImport: false // 禁用动态导入，避免 document 相关错误
        }
      },
      module: {
        rules: [
          {
            test: /\.js$/,
            exclude: /node_modules/,
            use: {
              loader: 'babel-loader',
              options: {
                presets: [
                  ['@babel/preset-env', {
                    modules: 'auto',
                    targets: {
                      chrome: "88"
                    }
                  }]
                ],
                plugins: ['@babel/plugin-transform-runtime']
              }
            }
          }
        ]
      },
      optimization: {
        minimize: !isDevelopment,
        minimizer: [
          '...',
          (compiler) => {
            const TerserPlugin = require('terser-webpack-plugin');
            new TerserPlugin({
              terserOptions: {
                keep_classnames: isDevelopment,
                keep_fnames: isDevelopment,
                compress: {
                  drop_console: !isDevelopment,
                  drop_debugger: !isDevelopment
                },
                sourceMap: isDevelopment
              }
            }).apply(compiler);
          }
        ],
        // 优化 splitChunks 配置，专门处理 Chrome 扩展
        splitChunks: {
          cacheGroups: {
            // 为 content script 创建独立的 vendor chunk
            contentVendor: {
              name: 'content-vendor',
              test: /[\\/]src[\\/]shared[\\/]/,
              chunks: (chunk) => chunk.name === 'content',
              enforce: true
            },
            // 为 popup 创建独立的 vendor chunk
            popupVendor: {
              name: 'popup-vendor',
              test: /[\\/]src[\\/]shared[\\/]/,
              chunks: (chunk) => chunk.name === 'popup',
              enforce: true
            }
          }
        }
      },
      plugins: [
        new CopyPlugin({
          patterns: [
            { from: 'manifest.json', to: 'manifest.json' },
            { from: 'src/popup/popup.html', to: 'popup/popup.html' },
            { from: 'src/content/assistant-panel.html', to: 'content/assistant-panel.html' },
            { from: 'assets/icons', to: 'assets/icons' }
          ]
        })
      ],
      resolve: {
        extensions: ['.js'],
        alias: {
          '@': path.resolve(__dirname, 'src'),
          '@lib': path.resolve(__dirname, 'src/lib'),
          '@utils': path.resolve(__dirname, 'src/utils'),
          '@ai': path.resolve(__dirname, 'src/ai'),
          '@shared': path.resolve(__dirname, 'src/shared'),
          '@background': path.resolve(__dirname, 'src/background'),
          '@content': path.resolve(__dirname, 'src/content'),
          '@popup': path.resolve(__dirname, 'src/popup')
        }
      },
      externals: {
        chrome: 'chrome'
      }
    },
    // CSS 配置
    {
      mode: argv.mode || 'development',
      entry: {
        assistantPanel: './src/content/assistant-panel.css',
        popupStyles: './src/popup/popup.css'
      },
      output: {
        path: path.resolve(__dirname, 'dist'),
        clean: false
      },
      module: {
        rules: [
          {
            test: /\.css$/,
            use: [
              MiniCssExtractPlugin.loader,
              {
                loader: 'css-loader',
                options: {
                  sourceMap: isDevelopment
                }
              },
              {
                loader: 'postcss-loader',
                options: {
                  postcssOptions: {
                    plugins: [
                      'autoprefixer',
                      'cssnano'
                    ]
                  }
                }
              }
            ]
          }
        ]
      },
      optimization: {
        minimizer: [
          '...',
          new CssMinimizerPlugin()
        ]
      },
      plugins: [
        new MiniCssExtractPlugin({
          filename: (pathData) => {
            const name = pathData.chunk.name;
            if (name === 'assistantPanel') {
              return 'content/assistant-panel.css';
            }
            if (name === 'popupStyles') {
              return 'popup/popup.css';
            }
            return '[name].css';
          }
        })
      ]
    }
  ];
}; 