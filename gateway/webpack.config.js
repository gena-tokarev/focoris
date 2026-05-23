const { composePlugins, withNx } = require('@nx/webpack');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = composePlugins(
  // Default Nx composable plugin
  withNx(),
  // Custom composable plugin
  (config, { options, context }) => {
    config.resolve ??= {};
    config.resolve.plugins = [
      ...(config.resolve.plugins ?? []),
      new TsconfigPathsPlugin({
        configFile: `${__dirname}/tsconfig.app.json`,
      }),
    ];

    if (context.configurationName !== 'production') {
      // Use full source maps in dev/debug for accurate TS breakpoint mapping.
      config.devtool = 'source-map';
    }

    return config;
  },
);
