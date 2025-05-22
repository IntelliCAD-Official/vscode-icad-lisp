import * as vscode from 'vscode';
import * as Net from 'net';
import * as os from 'os';
import * as cp from 'child_process';
import * as fs from 'fs';

import * as nls from 'vscode-nls';
const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

import { pickProcess } from './process/acadPicker';
import { calculateABSPathForDAP } from './platform';
import { existsSync } from 'fs';
import { ProcessPathCache } from './process/processCache';
import { DiagnosticsCtrl } from './diagnosticsCtrl';
import { getExtensionSettingString } from './resources';

let processPid2Attach = -1;

const attachCfgName = 'IntelliCAD Lisp Debug: Attach';
const attachCfgType = 'attach-icad';
const launchCfgName = 'IntelliCAD Lisp Debug: Launch';
const launchCfgType = 'launch-icad';

const LAUNCH_PROC:string = 'debug.LaunchProgram';
const LAUNCH_PARM:string = 'debug.LaunchParameters';
const ATTACH_PROC:string = 'debug.AttachProcess';

export function setDefaultProcessPid(pid: number) {
    processPid2Attach = pid;
}

function getServerPipeName(pid: number): string {
    return "\\\\.\\pipe\\itc\\dap-server-" + pid;
}

let launchedIcads = new Map<string, cp.ChildProcessWithoutNullStreams>();


class LaunchDebugAdapterExecutableFactory implements vscode.DebugAdapterDescriptorFactory {

    async createDebugAdapterDescriptor(session: vscode.DebugSession, executable: vscode.DebugAdapterExecutable | undefined) : Promise<vscode.DebugAdapterDescriptor | undefined> {

        let pid = await this.startProcess(session);
        return new vscode.DebugAdapterNamedPipeServer(getServerPipeName(pid)); 
    }

    async startProcess(session: vscode.DebugSession): Promise<number> {
        let launchedProcess = cp.spawn(ProcessPathCache.globalProductPath);
        if (!launchedProcess || launchedProcess.exitCode !== null) {
            let msg = localize("icad-lisp.debug.start.error", "Couldn't start the product.");
            throw new Error(msg);
        }

        if (await this.waitDapServer(launchedProcess, this.getConfigTimeout())) {
            launchedIcads.set(session.id, launchedProcess);
            return launchedProcess.pid;
        } else {
            launchedProcess.kill();
            let msg = localize("icad-lisp.debug.nodap2", "Couldn't connect to DAP server. Make sure DAP server is turned on in the product settings or increase the timeout.");
            throw new Error(msg);
        }
    }

    async waitDapServer(launchedProcess: cp.ChildProcessWithoutNullStreams, waitMs : number): Promise<boolean> {

		const ticks = 50;
        let iterations = waitMs / ticks;
		let i = 0;

        let pipeName = getServerPipeName(launchedProcess.pid);
		while (!this.existsNamedPipe(pipeName)) {
			i++;
			if (i > iterations || launchedProcess.exitCode !== null) {
                return false;
			}
            await new Promise((resolve) => setTimeout(resolve, ticks));
		}
        return true;
    }

    existsNamedPipe(pipeName: string) {
        // pipeName is \\pipe\itc\dap-server-xxxxx
        // shortName is itc\dap-server-xxxx
        let pipeDir = '\\\\.\\pipe\\';
        let shortName = pipeName.substring(pipeDir.length);
        return fs.readdirSync(pipeDir).includes(shortName);
    }

    getConfigTimeout() : number {
        let timeout : number = vscode.workspace.getConfiguration('icad-lisp').get('debug.LaunchTimeout');
        if (timeout < 1 || timeout > 60) {
            timeout = 15;
        }
        return timeout * 1000;
    }
}

class AttachDebugAdapterExecutableFactory implements vscode.DebugAdapterDescriptorFactory {
    createDebugAdapterDescriptor(_session: vscode.DebugSession, executable: vscode.DebugAdapterExecutable | undefined): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {

        let pipeName = getServerPipeName(ProcessPathCache.globalProductProcessId);
        return new vscode.DebugAdapterNamedPipeServer(pipeName);
    }
}

export function registerLispDebugProviders(context: vscode.ExtensionContext) {
    // register a configuration provider for 'lisp' launch debug type
    const launchProvider = new LispLaunchConfigurationProvider();
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider(launchCfgType, launchProvider));
    context.subscriptions.push(launchProvider);

    //register a configuration provider for 'lisp' attach debug type
    const attachProvider = new LispAttachConfigurationProvider();
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider(attachCfgType, attachProvider));
    context.subscriptions.push(attachProvider);

    // to close the launched process when the session is closed
    vscode.debug.registerDebugAdapterTrackerFactory(launchCfgType, {
        createDebugAdapterTracker(session: vscode.DebugSession) {
            return {
/*              onWillReceiveMessage: m => console.log(`> ${JSON.stringify(m, undefined, 2)}`),
                onDidSendMessage: m => console.log(`< ${JSON.stringify(m, undefined, 2)}`),
                onError(error: Error): void { 
                    console.log(`> onError: ${error}`);
                },
                onExit(code: undefined | number, signal: undefined | string): void { 
                    console.log(`> onExit: code=${code}, signal=${signal}`);
                },
*/              onWillStopSession(): void {
				    let process = launchedIcads.get(session.id);
				    if (process) {
                        launchedIcads.delete(session.id);
					    process.kill();
				    }
			    }
            };
        }
    });



    //-----------------------------------------------------------
    // debug adapter
    //-----------------------------------------------------------
    const attachDapFactory = new AttachDebugAdapterExecutableFactory();
    const lauchDapFactory = new LaunchDebugAdapterExecutableFactory();
    context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory(attachCfgType, attachDapFactory));
    context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory(launchCfgType, lauchDapFactory));
}

class LispLaunchConfigurationProvider implements vscode.DebugConfigurationProvider {

    private _server?: Net.Server;

    async resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration> {

        var newConfig = {} as vscode.DebugConfiguration;
        newConfig.type = launchCfgType;
        newConfig.name = launchCfgName;
        newConfig.request = 'launch';
        
        if (vscode.window.activeTextEditor) {
            newConfig.program = vscode.window.activeTextEditor.document.fileName;
        }

        let productPath = getExtensionSettingString(LAUNCH_PROC);
        if (!productPath) {
            let msg = localize("icad-lisp.debug.prod.path.win", "Specify the absolute path for the product. For example, C://Program Files//ITC//IntelliCAD//Icad.exe.");
            productPath = await vscode.window.showInputBox({ placeHolder: msg });
            if (productPath) {
                productPath = productPath.replace(/\"/gi, '');
            }
            rememberLaunchPath(productPath);
        }

        if (!existsSync(productPath)) {
            let strNoACADerr: string = localize("icad-lisp.debug.nofile", "doesn’t exist. Verify and correct the folder path to the product executable.");
            if (!productPath || productPath.length == 0) {
                vscode.window.showErrorMessage("IntelliCAD " + strNoACADerr);
            } else {
                vscode.window.showErrorMessage(productPath + " " + strNoACADerr);
            }
            ProcessPathCache.globalProductPath = "";
            ProcessPathCache.globalProductProcessId = -1;
            return undefined;
        }

        ProcessPathCache.globalProductPath = productPath;
        ProcessPathCache.globalParameter = getExtensionSettingString(LAUNCH_PARM);

        return newConfig;
    }

    dispose() {
        if (this._server) {
            this._server.close();
        }
    }
}

class LispAttachConfigurationProvider implements vscode.DebugConfigurationProvider {

    private _server?: Net.Server;

    async resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration> {
        var newConfig = {} as vscode.DebugConfiguration;
        newConfig.type = attachCfgType;
        newConfig.name = attachCfgName;
        newConfig.request = 'attach';

        if (vscode.window.activeTextEditor) {
            newConfig.program = vscode.window.activeTextEditor.document.fileName;
        }

        ProcessPathCache.globalAcadNameInUserAttachConfig = '';
        let name = getExtensionSettingString(ATTACH_PROC);
        if (name) {
            ProcessPathCache.globalAcadNameInUserAttachConfig = name;
        }

        ProcessPathCache.clearProductProcessPathArr();
        let processId = await pickProcess(false, processPid2Attach);
        if (!processId) {
            let msg = localize("icad-lisp.debug.noprocess.eror", "No process for which to attach could be found.");
            return vscode.window.showInformationMessage(msg).then(_ => {
                return undefined;	// abort attach
            });
        }
        ProcessPathCache.chooseProductPathByPid(parseInt(processId));

        return newConfig;
    }

    dispose() {
        if (this._server) {
            this._server.close();
        }
    }
}


function rememberLaunchPath(path: string) {
    if (existsSync(path) == false) {
        return;
    }

    let settingGroup = vscode.workspace.getConfiguration('icad-lisp');
    if (!settingGroup) {
        return null;
    }

    settingGroup.update(LAUNCH_PROC, path, true).then(
        () => {
            console.log("Launch path stored in extension setting");
        },
        (err) => {
            if (err) {
                vscode.window.showErrorMessage(err.toString());
            }
        });
}