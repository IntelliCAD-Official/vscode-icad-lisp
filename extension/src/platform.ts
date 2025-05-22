import * as os from 'os';
import { existsSync } from 'fs';
import * as path from 'path';

//calculate the absolute path of debuger
//for windows dap is in the same folder with debugger
//for mac dap is under the Helpers folder
export function calculateABSPathForDAP(productPath){
	if(!existsSync(productPath)){
		return "";
	}
	let folder = path.dirname(productPath);
	let platform = os.type();						//reference - https://nodejs.org/api/os.html#os_os_type
	if(platform === 'Windows_NT'){
		return folder + "\\AutoLispDebugAdapter.exe";
	}else if(platform === 'Darwin'){
		return folder + "/../Helpers/AutoLispDebugAdapter.app/Contents/MacOS/AutoLispDebugAdapter";
	}else{
		return "";
	}
}

//calculate the process name for IntelliCAD process picker
export function calculateICADProcessName(pName){
	let processName = pName ? pName.replace(".exe", "") : "";
	if(processName !== "")
		return processName;

	let platform = os.type();						//reference - https://nodejs.org/api/os.html#os_os_type
	
	if(platform === 'Windows_NT'){
		return "icad";
	}else if(platform === 'Darwin'){
		return "IntelliCAD";
	}else{
		return "";
	}
}

export function isSupportedLispFile(path){
	let ext = path.substring(path.length - 3, path.length).toUpperCase();
	let platform = os.type();
	if(platform === 'Windows_NT'){
		return ext === "LSP" || ext === "MNL" || ext === "DCL" || ext === "SCR";
	}else if(platform === 'Darwin'){
		return ext === "LSP" || ext === "DCL";
	}else{
		return false;
	}
}