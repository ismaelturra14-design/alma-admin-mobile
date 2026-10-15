
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const config = getDefaultConfig(__dirname);
const nanoidNonSecurePath = require.resolve('nanoid/non-secure');

if (!config.resolver.sourceExts.includes('cjs')) {
  config.resolver.sourceExts.push('cjs');
}

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'nanoid/non-secure') {
    const relativePath = path
      .relative(path.dirname(context.originModulePath), nanoidNonSecurePath)
      .replace(/\\/g, '/');

    return context.resolveRequest(
      context,
      relativePath.startsWith('.') ? relativePath : `./${relativePath}`,
      platform,
    );
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
