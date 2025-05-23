# Welcome to IntelliCAD Lisp Debugger

IntelliCAD Lisp Debugger is a vscode extension for editing and debugging IntelliCAD Lisp. The Extension plays the roles of both debug adapter and language server which could enable you debug Lisp with IntelliCAD. The following description is for developers.

## How to setup the Dev env and compile the code
Firstly you should make sure you have installed python and NodeJS.
Then you could do all the steps in the script pack.py, it is python2; or run it directly:
```
cd vscode-icad-lisp
npm install --global gulp-cli
python pack.py
```

### How to compile the codes
The script pack.py will copy some utility files to correct location for making package. After run that script and then change some TS codes, you can also use the follow command to compile codes simply:
```
npm run compile
```

## How to debug the extension

1. open the source codes folder "vscode-icad-lisp" in the vscode.
2. add some breakpoints as needed.
3. hit F5 and select "Extension Client", then it will start another vscode instance with running the extension.
4. Do some operations to invoke the codes which are added breakpoints, vscode will stop in the first instance.

## How to package the extension

You could package the extension by:
```
python pack.py
```
It will create the package in the current folder.

## Run tests

You have two ways to run the tests:
  - Run inside the VS Code and begin debugging by choosing "Extension Tests"
  - Run on terminal outside of VS Code and make sure no VS code is running (VS Code terminal will not work due to VS Code limitation)
```
npm run test
```

### Localization notices
It uses the gulp to do localization to reference project https://github.com/microsoft/vscode-extension-samples/tree/master/i18n-sample
And the codes in each ts file:
```
const localize = nls.config({ messageFormat: nls.MessageFormat.file })();
```
does good stuffs for localization.

### Profile the performence issue
For the performence issue of vscode extension, see wiki page https://github.com/microsoft/vscode-wiki/blob/master/Performance-Issues.md
