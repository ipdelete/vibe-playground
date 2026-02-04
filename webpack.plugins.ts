import type IForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import MonacoWebpackPlugin from 'monaco-editor-webpack-plugin';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ForkTsCheckerWebpackPlugin: typeof IForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

// Base plugins for all configs
export const plugins = [
  new ForkTsCheckerWebpackPlugin({
    logger: 'webpack-infrastructure',
  }),
];

// Additional plugins for renderer only (includes Monaco)
export const rendererPlugins = [
  new ForkTsCheckerWebpackPlugin({
    logger: 'webpack-infrastructure',
  }),
  new MonacoWebpackPlugin({
    languages: ['typescript', 'javascript', 'json', 'markdown', 'css', 'html', 'python', 'yaml'],
  }),
];
