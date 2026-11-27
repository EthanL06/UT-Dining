module.exports = (api) => {
  api.cache(true);
  const plugins = [['inline-import', { extensions: ['.sql'] }], './babel-plugin-lucide-icons.cjs'];

  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],

    plugins,
  };
};
