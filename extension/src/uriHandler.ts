//
'use strict';

import * as vscode from 'vscode';

import {
    acitiveDocHasValidLanguageId
} from './utils'
import { setDefaultProcessPid } from "./debug"
import * as nls from 'vscode-nls';
const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

function getUrlParams(queryString) {
    let hashes = queryString.split('&')
    return hashes.reduce((params, hash) => {
        let [key, val] = hash.split('=')
        return Object.assign(params, { [key]: decodeURIComponent(val) })
    }, {})
}

const modalMsgOption = { modal: true };
export function onUriRequested(uri: vscode.Uri) {
    let qs = getUrlParams(uri.query);

    let pidStr = qs["pid"];
    if (pidStr === undefined) {
        let msg = localize("icad-lisp.urihandler.invaid", "Invalid call to IntelliCAD Lisp Debugger.");
        vscode.window.showInformationMessage(msg);
        return;
    }

    setDefaultProcessPid(parseInt(pidStr));

    if (vscode.debug.activeDebugSession) {
        let msg = localize("icad-lisp.urihandler.activeddebugcfg", "Current debug configuration: ");
        vscode.window.showInformationMessage(msg + vscode.debug.activeDebugSession.name,
            modalMsgOption);
        return;
    }

    if (vscode.window.activeTextEditor) {
        if (acitiveDocHasValidLanguageId()) {
            let msg = localize("icad-lisp.urihandler.debug.start",
                "From the menu bar, click Run > Start Debugging to debug the current LISP source file.");
            vscode.window.showInformationMessage(msg, modalMsgOption);
        }
        else {
            let msg = localize("icad-lisp.urihandler.debug.openfile",
                "Open a LISP source file and click Run > Start Debugging from the menu bar to debug the file.");
            vscode.window.showInformationMessage(msg, modalMsgOption);
        }

        return;
    }

    let msg = localize("icad-lisp.urihandler.debug.openfile",
        "Open a LISP source file and click Run > Start Debugging from the menu bar to debug the file.");
    vscode.window.showInformationMessage(msg, modalMsgOption);

    return;

}
