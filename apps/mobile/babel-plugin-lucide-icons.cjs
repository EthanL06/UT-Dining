const { readFileSync } = require('node:fs');
const { dirname, join } = require('node:path');

const PACKAGE = 'lucide-react-native';

const readIconFiles = () => {
  const cjsEntry = require.resolve(PACKAGE, { paths: [__dirname] });
  const barrel = readFileSync(join(dirname(cjsEntry), '../esm/lucide-react-native.mjs'), 'utf8');
  const files = new Map();
  for (const match of barrel.matchAll(/export \{([^}]+)\} from '\.\/icons\/([^']+)\.mjs';/g)) {
    for (const specifier of match[1].split(',')) {
      const name = specifier.trim().match(/^default as (\w+)$/);
      if (name) files.set(name[1], match[2]);
    }
  }
  if (files.size === 0) {
    throw new Error(
      `babel-plugin-lucide-icons found no icons in ${PACKAGE}. Its build layout changed.`,
    );
  }
  return files;
};

module.exports = ({ types: t }) => {
  const files = readIconFiles();
  return {
    name: 'lucide-icons',
    visitor: {
      ImportDeclaration(path) {
        const { node } = path;
        if (node.source.value !== PACKAGE || node.importKind === 'type') return;
        const icons = [];
        const rest = [];
        for (const specifier of node.specifiers) {
          const imported =
            specifier.type === 'ImportSpecifier' && specifier.importKind !== 'type'
              ? (specifier.imported.name ?? specifier.imported.value)
              : null;
          const file = imported ? files.get(imported) : undefined;
          if (file) icons.push({ local: specifier.local.name, file });
          else rest.push(specifier);
        }
        if (icons.length === 0) return;
        const replacements = icons.map(({ local, file }) =>
          t.importDeclaration(
            [t.importDefaultSpecifier(t.identifier(local))],
            t.stringLiteral(`${PACKAGE}/icons/${file}`),
          ),
        );
        if (rest.length > 0) {
          node.specifiers = rest;
          path.insertAfter(replacements);
        } else {
          path.replaceWithMultiple(replacements);
        }
      },
    },
  };
};
