//
// processTree.ts
//
// CREATED BY:  yunjian.zhang               DECEMBER. 2018
//
// DESCRIPTION: Lisp vscode extension core code.
//
'use strict';

import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';

import { ProcessPathCache } from "./processCache";

function isNothingFound(msg : string) {
	if(msg && (msg.indexOf('No Instance(s) Available.') >= 0)) {
		return true;
	}
	return false;
}

export function getProcesses(one: (pid: number, ppid: number, command: string, args: string, exepath: string, date?: number, title?: string) => void) : Promise<void> {

	function lines(callback: (a: string) => void) {
		let unfinished = '';
		return (data: string | Buffer) => {
			const lines = data.toString().split(/\r?\n/);
			const finishedLines = lines.slice(0, lines.length - 1);
			finishedLines[0] = unfinished + finishedLines[0];
			unfinished = lines[lines.length - 1];
			for (const s of finishedLines) {
				callback(s);
			}
		};
	}

	return new Promise((resolve, reject) => {

		let proc: ChildProcess;

		if (process.platform === 'win32') {
			let acadExeName = undefined;
			if(ProcessPathCache.globalAcadNameInUserAttachConfig)
				acadExeName = ProcessPathCache.globalAcadNameInUserAttachConfig;
			else
				acadExeName = 'icad';

			const CMD_PAT = /^(.*)\s+([0-9]+)\.[0-9]+[+-][0-9]+\s+(.*)\s+([0-9]+)\s+([0-9]+)$/;
			//const CMD_PAT = /^(.*)\s+([0-9]+)\.[0-9]+[+-][0-9]+\s+([0-9]+)\s+([0-9]+)$/;
			const acadProcFinder = join(__dirname, 'icadProcessFinder.exe');
			proc = spawn(acadProcFinder, [ acadExeName ]);
			proc.stdout.setEncoding('utf8');
			proc.stdout.on('data', lines(line => {
				//let matches = _.compact(line.trim().split(' '));
				let cells = line.split('\t');
				if(cells.length == 5) {
					let exePath = cells[0];
					let startTime = cells[1];
					let args = cells[2];
					let pid = cells[3];
					let title = cells[4];

					one(Number(pid), -1, exePath, args, exePath, Number(startTime), title);
				}
			}));

		} else if (process.platform === 'darwin') {	// OS X

			proc = spawn('/bin/ps', [ '-x', '-o', `pid,ppid,comm=${'a'.repeat(256)},command` ]);
			proc.stdout.setEncoding('utf8');
			proc.stdout.on('data', lines(line => {

				const pid = Number(line.substr(0, 5));
				const ppid = Number(line.substr(6, 5));
				const command = line.substr(12, 256).trim();
				const args = line.substr(269 + command.length);

				if (!isNaN(pid) && !isNaN(ppid)) {
					one(pid, ppid, command, args, command);
				}
			}));

		} else {	// linux

			proc = spawn('/bin/ps', [ '-ax', '-o', 'pid,ppid,comm:20,command' ]);
			proc.stdout.setEncoding('utf8');
			proc.stdout.on('data', lines(line => {

				const pid = Number(line.substr(0, 5));
				const ppid = Number(line.substr(6, 5));
				let command = line.substr(12, 20).trim();
				let args = line.substr(33);

				let pos = args.indexOf(command);
				if (pos >= 0) {
					pos = pos + command.length;
					while (pos < args.length) {
						if (args[pos] === ' ') {
							break;
						}
						pos++;
					}
					command = args.substr(0, pos);
					args = args.substr(pos + 1);
				}

				if (!isNaN(pid) && !isNaN(ppid)) {
					one(pid, ppid, command, args, command);
				}
			}));
		}

		proc.on('error', err => {
			reject(err);
		});

		proc.stderr.setEncoding('utf8');
		proc.stderr.on('data', data => {
			if(isNothingFound(data.toString())) {
				resolve();
			}
			else {
				reject(new Error(data.toString()));
			}
		});

		proc.on('close', (code, signal) => {
			if (code === 0) {
				resolve();
			} else if (code > 0) {
				reject(new Error(`process terminated with exit code: ${code}`));
			}
			if (signal) {
				reject(new Error(`process terminated with signal: ${signal}`));
			}
		});

		proc.on('exit', (code, signal) => {
			if (code === 0) {
				//resolve();
			} else if (code > 0) {
				reject(new Error(`process terminated with exit code: ${code}`));
			}
			if (signal) {
				reject(new Error(`process terminated with signal: ${signal}`));
			}
		});
	});
}