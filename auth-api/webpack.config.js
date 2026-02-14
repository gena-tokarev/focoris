const { composePlugins, withNx } = require('@nx/webpack');

module.exports = composePlugins(
  // Default Nx composable plugin
  withNx(),
  // Custom composable plugin
  (config, { context }) => {
    if (context.configurationName !== 'production') {
      // Use full source maps in dev/debug for accurate TS breakpoint mapping.
      config.devtool = 'source-map';
    }

    return config;
  },
);
