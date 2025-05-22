import * as vscode from 'vscode';
import { isSupportedLispFile } from './platform';
import * as os from 'os';
import * as nls from 'vscode-nls';
const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export function registerLoadLispButton(context: vscode.ExtensionContext) {
	let lspLoadButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
	let title = localize("icad-lisp.loadlisp.title", "Load lisp");
	lspLoadButton.text = "📄" + title;
	lspLoadButton.color = 'white';
	lspLoadButton.tooltip = localize("icad-lisp.loadlisp.tooltip", "Load the Current File");
	lspLoadButton.command = "icad.loadActiveFile";
	lspLoadButton.show();
	context.subscriptions.push(vscode.commands.registerCommand("icad.loadActiveFile", () => {
		let currentLSPDoc = vscode.window.activeTextEditor.document.fileName;
		if(isSupportedLispFile(currentLSPDoc)) {
			//execute load progress 
			if (vscode.debug.activeDebugSession !== undefined) {
				vscode.debug.activeDebugSession.customRequest("customLoad", { path : currentLSPDoc });
			} else {
				const message = localize("icad-lisp.loadlisp.attach", "First, attach to or launch a host application before loading this file.");
				vscode.window.showErrorMessage(message);
			}
		} else {
			let platform = os.type();
			if(platform === 'Windows_NT'){
				const message = localize("icad-lisp.loadlisp.fileformat.win", "This file format isn’t supported. Activate a window containing a DCL, LSP, or MNL file.");
				vscode.window.showErrorMessage(message);
			}
			else{
				const message = localize("icad-lisp.loadlisp.fileformat.mac", "This file format isn’t supported. Activate a window containing a DCL or LSP file.");
				vscode.window.showErrorMessage(message);
			}	
		}
	}));
	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(e => {
		if (!e) {
			// this test resolves a non-breaking error when manually running npm test scripts from command line
			return;
		}
		let currentLSPDoc = vscode.window.activeTextEditor.document.fileName;
		if(isSupportedLispFile(currentLSPDoc)) {
			lspLoadButton.show();
		} else {
			lspLoadButton.hide();
		}
	}));
}