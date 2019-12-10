const _ = require('lodash');
const VS = require('../helper/vscodeWrapper');
const vscode = new VS();
const { readFilesFromDir } = require('../helper/utils');
const { fixtureAutocompletionCommands } = vscode.config();

class FixtureCompletionProvider {
  provideCompletionItems(document, position, token, context) {
    const start = vscode.Position(position.line, 0);
    const range = vscode.Range(start, position);
    const text = document.getText(range);

    // break if fixture autocomplete is not needed
    if (
      !fixtureAutocompletionCommands.some(command => {
        const commandPattern = `.${command}`;
        return (
          text.includes(commandPattern) &&
          // verify that cursor position is after command that require autocomplete
          // but before next chainer
          text
            .substring(text.indexOf(commandPattern), position.character)
            .split('.').length === 2 // [empty string before `.` or `cy`, command string]
        );
      })
    ) {
      return undefined;
    }

    // in case of triggering autocomplete for subfolders - detect last folder from already used
    const firstAutocompletion = context.triggerCharacter === '(';
    const baseFolder = firstAutocompletion
      ? 'fixtures'
      : _.last(text.slice(0, -1).split(/"|'|`/));
    if (!baseFolder) {
      return undefined;
    }

    // get fs path for fixtures
    const fixtures =
      readFilesFromDir('fixtures', {
        extension: '',
        name: ''
      }) || [];

    // find files and folders that are right inside of base folder
    const files = fixtures
      .map(fixture => {
        const folders = fixture.path.split('/');
        const baseFolderIndex = folders.indexOf(_.last(baseFolder.split('/')));
        return folders[baseFolderIndex + 1];
      })
      .filter(f => f !== '');

    // prepare completion items list
    const fixtureResults = _.uniq(files).reduce((completions, file) => {
      /**
       * FILE: 16
       * FOLDER: 18
       */
      const type = file.includes('.') ? 16 : 18;
      const insertText = type === 16 ? file.replace('.json', '') : file;
      completions.push({
        label: file,
        kind: type,
        insertText: firstAutocompletion ? `"${insertText}"` : insertText
      });
      return completions;
    }, []);
    return {
      items: fixtureResults
    };
  }
}

module.exports = FixtureCompletionProvider;