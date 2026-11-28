module.exports = {
  sourceSkips: [
    'PackageJsonAndroidAndIosScriptsIfNotContainRun',
    'ExpoConfigVersions',
    'ExpoConfigRuntimeVersionIfString',
    'EasJson',
    'Easignore',
    'AutolinkingConfigPaths',
    'ExpoConfigExtraSection',
  ],
  extraSources: [{ type: 'dir', filePath: '../../patches', reasons: ['workspacePatches'] }],
};
