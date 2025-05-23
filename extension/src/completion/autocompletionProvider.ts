import * as vscode from 'vscode';
import * as os from 'os';
import { isCursorInDoubleQuoteExpr } from "../format/autoIndent";
import { IcadExt} from "../context";


export function isInternalLispOp(item: string): boolean {
    if (!item)
        return false;

    for (let i = 0; i < IcadExt.Resources.internalLispFuncs.length; i++) {
        if (IcadExt.Resources.internalLispFuncs[i] === item)
            return true;
    }
    return false;
}


export function getCmdAndVarsCompletionCandidates(allCandiates: string[], word: string, userInputIsUpper: boolean): Array<vscode.CompletionItem> {
    var hasUnderline = false;
    if (word[0] == "_") {
        hasUnderline = true;
        word = word.substring(1);
    }

    var hasDash = false;
    if (word[0] == "-") {
        hasDash = true;
    }

    let suggestions: Array<vscode.CompletionItem> = [];
    allCandiates.forEach((item) => {
        var candidate = item;
        if (userInputIsUpper)
            candidate = item.toUpperCase();
        else
            candidate = item.toLowerCase();

        if (candidate.startsWith(word)) {
            var label = candidate;

            // The _ symbol has special mean in IntelliCAD commands, so we add the prefix if it matches the command name
            if (hasUnderline)
                label = "_" + label;

            const completion = new vscode.CompletionItem(label);

            // to work around the middle dash case issue in vscode, when insert it ignores the dash
            if (hasDash)
                completion.insertText = label.substring(1);

            suggestions.push(completion);
        }
    });

    return suggestions;
}

function getCompletionCandidates(allCandiates: string[], word: string, userInputIsUpper: boolean): Array<vscode.CompletionItem> {
    let suggestions: Array<vscode.CompletionItem> = [];
    allCandiates.forEach((item) => {
        var candidate = item;
        if (userInputIsUpper)
            candidate = item.toUpperCase();
        else
            candidate = item.toLowerCase();

        if (candidate.startsWith(word)) {
            var label = candidate;
            const completion = new vscode.CompletionItem(label);
            suggestions.push(completion);
        }
    });

    return suggestions;
}

export function getMatchingWord(document: vscode.TextDocument, position: vscode.Position): [string, boolean] {
    let linetext = document.lineAt(position).text;

    let word = document.getText(document.getWordRangeAtPosition(position));
    let wordSep = " &#^()[]|;'\".";

    // LISP has special word range rules and now VScode has some issues to check the "word" range, 
    // so it needs this logic to check the REAL word range
    let pos = position.character;
    pos -= 2;
    let length = 1;
    let hasSetLen = false;
    for (; pos >= 0; pos--) {
        let ch = linetext.charAt(pos);
        if (wordSep.includes(ch)) {
            if (!hasSetLen)
                length = word.length;
            word = linetext.substr(pos + 1, length);
            break;
        }
        length++;
        hasSetLen = true;
    }

    var isupper = () => {
        var lastCh = word.slice(-1);
        var upper = lastCh.toUpperCase();
        if (upper != lastCh.toLowerCase() && upper == lastCh)
            return true;
        return false;
    }
    var inputIsUpper = isupper();
    if (inputIsUpper)
        word = word.toUpperCase();
    else word = word.toLowerCase();

    return [word, inputIsUpper];
}

export function getLispAndDclCompletions(document: vscode.TextDocument, word: string, isupper: boolean): vscode.CompletionItem[] {
    let currentLSPDoc = document.fileName;
    let ext = currentLSPDoc.substring(currentLSPDoc.length - 4, currentLSPDoc.length).toUpperCase();
    let candidatesItems = IcadExt.Resources.internalLispFuncs;
    if (ext === ".DCL") {
        candidatesItems = IcadExt.Resources.internalDclKeys;
    }
    let allSuggestions: Array<vscode.CompletionItem> = [];
    allSuggestions = getCompletionCandidates(candidatesItems, word, isupper);

    if (os.platform() === "win32") {
        return allSuggestions;
    }
    else {
        return allSuggestions.filter(function(suggestion) {
            for (var prefix of IcadExt.Resources.winOnlyListFuncPrefix) {
                if (suggestion.label.toString().startsWith(prefix)) {
                    return false;
                }
            }
            return true;
        });
    }
    return allSuggestions;
}

export function registerAutoCompletionProviders() {
    vscode.languages.registerCompletionItemProvider(['icad-lisp', 'lsp', 'icad-dcl'], {

        provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {

            try {
                let linetext = document.lineAt(position).text;
                if (linetext.startsWith(";") || linetext.startsWith(";;")
                    || linetext.startsWith("#|")) {
                    return [];
                }

                let [inputword, userInputIsUpper] = getMatchingWord(document, position);
                if (inputword.length == 0)
                    return [];

                var isInDoubleQuote = isCursorInDoubleQuoteExpr(document, position);
                if (isInDoubleQuote) {
                    var cmds = getCmdAndVarsCompletionCandidates(IcadExt.Resources.allCmdsAndSysvars, inputword, userInputIsUpper);
                    return cmds;
                }

                return getLispAndDclCompletions(document, inputword, userInputIsUpper);
            }
            catch (err) {
                return [];
            }
        }
    });
}