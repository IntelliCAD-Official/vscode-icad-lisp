import * as vscode from "vscode";
import {
	TextDocument, ProviderResult, CancellationToken,
	Position, Range,
	CompletionContext, CompletionItem, CompletionList
} from "vscode";

import * as nls from 'vscode-nls';
import { IcadExt } from './context';
import { generateDocumentationSnippet, getDefunArguments, getDefunAtPosition } from './help/userDocumentation';
import { showErrorMessage } from './project/projectCommands';
import { IcadExtProvideDefinition } from './providers/gotoProvider';
import { IcadExtProvideReferences } from './providers/referenceProvider';
import { IcadExtPrepareRename, IcadExtProvideRenameEdits } from './providers/renameProvider';
import { SymbolManager } from './symbols';
import { IcadExtProvideHover} from "./providers/hoverProvider";
import { DocumentServices } from './services/documentServices';
import { invokeCompletionProviderDcl } from './completion/completionProviderDcl';

const localize = nls.loadMessageBundle();

export function registerCommands(context: vscode.ExtensionContext){

	context.subscriptions.push(vscode.commands.registerCommand('icad.openWebHelp', async () => {
		// Note: this function is directly referenced by the package.json contributes (commands & menus) section.
		// 		 Associated with the right click "Open Online Help" menu item.
		try {
			const editor: vscode.TextEditor = vscode.window.activeTextEditor;
			let selected: string = editor.document.getText(editor.selection);
			if (selected === "") {
				await vscode.commands.executeCommand('editor.action.addSelectionToNextFindMatch');
				selected = editor.document.getText(editor.selection);
			}
			let urlPath: string = IcadExt.WebHelpLibrary.getWebHelpUrlBySymbolName(selected, editor.document.fileName);
			if (urlPath.trim() !== ""){
				vscode.env.openExternal(vscode.Uri.parse(urlPath));
			}
		}
		catch (err) {
			if (err){
				let msg = localize("icad-lisp.help.commands.openWebHelp", "Failed to load the webHelpAbstraction.json file");
				showErrorMessage(msg, err);
			}
		}
	}));
	

	// Associated with the right click "Insert Region" menu item
	context.subscriptions.push(vscode.commands.registerCommand("icad.insertFoldingRegion", async () => {
		try {
			let commentChar = vscode.window.activeTextEditor.document.fileName.toUpperCase().slice(-4) === ".DCL" ? "//" : ";";
			const snip = new vscode.SnippetString(commentChar + "#region ${1:description}\n${TM_SELECTED_TEXT}\n" + commentChar + "#endregion");
			await vscode.window.activeTextEditor.insertSnippet(snip);
		}
		catch (err) {
			if (err){
				let msg = localize("icad-lisp.commands.addFoldingRegion", "Failed to insert snippet");
				showErrorMessage(msg, err);
			}
		}
	}));


	// Associated with the right click "Generate Documentation" menu item
	context.subscriptions.push(vscode.commands.registerCommand('icad.generateDocumentation', async () => {
		try {
			const pos = vscode.window.activeTextEditor.selection.start;
			const vsDoc = vscode.window.activeTextEditor.document;
			const lf = vsDoc.eol === vscode.EndOfLine.LF ? '\n' : '\r\n';
			const doc = IcadExt.Documents.getDocument(vsDoc);
			if (!doc.isLSP) {
				return;
			}
			
			// find the root LispContainer of the current cursor position
			const exp = doc.documentContainer.atoms.find(p => p.contains(pos));

			// Locate the Defun to decorate
			const def = await getDefunAtPosition(exp, pos);

			// extract the Defun arguments for @Param documentation
			const args =  getDefunArguments(def);
			
			// generate a dynamic snippet multi-line comment to represent the defun and its arguments
			const snip = generateDocumentationSnippet(lf, args);

			vscode.window.activeTextEditor.insertSnippet(snip, def.getRange().start);
		}
		catch (err) {
			if (err) {
				let msg = localize("icad-lisp.help.commands.generateDocumentation", "A valid defun name could not be located");
				showErrorMessage(msg, err);
			}
		}
	}));

	IcadExt.Subscriptions.push(vscode.languages.registerDefinitionProvider([DocumentServices.Selectors.LSP, 'lisp'], {
		provideDefinition: function (document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken)
						 			: vscode.ProviderResult<vscode.Definition | vscode.LocationLink[]> {
			// Purpose: locate potential source definitions of the underlying symbol
			try {
				// offload all meaningful work to something that can be tested.
				const result = IcadExtProvideDefinition(document, position);
				if (!result) {
					return;
				}
				return result;
			} catch (err) {
				return;	// I don't believe this requires a localized error since VSCode has a default "no definition found" response
			}
		}
	}));

	const msgRenameFail = localize("icad-lisp.providers.rename.failed", "The symbol was invalid for renaming operations");
	IcadExt.Subscriptions.push(vscode.languages.registerRenameProvider([DocumentServices.Selectors.LSP, 'lisp'], {
		prepareRename: function (document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken)
							    : vscode.ProviderResult<vscode.Range | { range: vscode.Range; placeholder: string; }> 
		{
			// Purpose: collect underlying symbol range and feed it as rename popup's initial value
			try {
				// offload all meaningful work to something that can be tested.
				const result = IcadExtPrepareRename(document, position);
				if (!result) {
					return;
				}
				return result;
			} catch (err) {
				if (err){
					showErrorMessage(msgRenameFail, err);
				}
			}
		},

		provideRenameEdits: function (document: vscode.TextDocument, position: vscode.Position, newName: string, token: vscode.CancellationToken)
						             : vscode.ProviderResult<vscode.WorkspaceEdit> 
		{
			// Purpose: only fires if the user provided rename popup with a tangible non-equal value. From here, our
			//			goal is to find & generate edit information for all valid rename targets within known documents
			try {
				// offload all meaningful work to something that can be tested.
				const result = IcadExtProvideRenameEdits(document, position, newName);
				if (!result) {
					return;
				}
				// subsequent renaming operations could pull outdated cached symbol maps if we don't clear the cache.
				SymbolManager.invalidateSymbolMapCache();
				return result;
			} catch (err) {
				if (err){
					showErrorMessage(msgRenameFail, err);
				}
			}
		}
	}));


	IcadExt.Subscriptions.push(vscode.languages.registerReferenceProvider([ DocumentServices.Selectors.LSP, 'lisp'], {
		provideReferences: function (document: vscode.TextDocument, position: vscode.Position, context: vscode.ReferenceContext, token: vscode.CancellationToken)
									: vscode.ProviderResult<vscode.Location[]> 
		{
			// Purpose in theory: locate scoped reference across the workspace, project and/or randomly opened documents
			// Purpose in practice: similar to theory, but mostly provides visibility to what our "renameProvider" would effect
			try {
				// offload all meaningful work to something that can be tested.
				const result = IcadExtProvideReferences(document, position);
				if (!result) {
					return;
				}
				return result;
			} catch (err) {
				return;	// No localized error since VSCode has a default "no results" response
			}
		}
	}));

	IcadExt.Subscriptions.push(vscode.languages.registerHoverProvider([DocumentServices.Selectors.LSP, DocumentServices.Selectors.DCL], {
		provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
			try {
				// offload all meaningful work to something that can be tested.
				const roDoc = IcadExt.Documents.getDocument(document);
				return IcadExtProvideHover(roDoc, position);
			} catch (err) {
				return;	// No localized error since VSCode has a default "no results" response
			}
		}
	}));

	IcadExt.Subscriptions.push(vscode.languages.registerCompletionItemProvider([DocumentServices.Selectors.DCL], {

		provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext) : ProviderResult<CompletionItem[]|CompletionList> {
			const roDoc = IcadExt.Documents.getDocument(document);
			return invokeCompletionProviderDcl(roDoc, position, context);
		}
	}, ...[' ', ':', '=', ';', '/']));


}