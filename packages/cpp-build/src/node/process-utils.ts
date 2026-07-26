// *****************************************************************************
// Copyright (C) 2026 akhilp19 and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

export interface CommandResult {
    readonly exitCode: number;
    readonly stdout: string;
    readonly stderr: string;
}

export function runCommand(command: string, args: string[], cwd?: string): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd,
            shell: process.platform === 'win32'
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', data => {
            stdout += data.toString();
        });

        child.stderr?.on('data', data => {
            stderr += data.toString();
        });

        child.on('error', reject);
        child.on('close', exitCode => {
            resolve({ exitCode: exitCode ?? -1, stdout, stderr });
        });
    });
}

export async function exists(filePath: string): Promise<boolean> {
    try {
        const stat = await fs.stat(filePath);
        return stat.isFile() || stat.isDirectory();
    } catch {
        return false;
    }
}

export async function readJson<T>(filePath: string): Promise<T | undefined> {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content) as T;
    } catch {
        return undefined;
    }
}

export function findExistingDirectory(candidates: string[]): Promise<string | undefined> {
    return candidates.reduce<Promise<string | undefined>>(async (prev, candidate) => {
        const found = await prev;
        if (found) {
            return found;
        }
        return (await exists(candidate)) ? candidate : undefined;
    }, Promise.resolve(undefined));
}

export function getWorkspaceRootPath(maybeUri: string): string {
    // Theia URIs may be file://, vscode-remote://, etc. For local backend execution, strip the scheme.
    if (maybeUri.startsWith('file://')) {
        return fileURLToPath(maybeUri);
    }
    return maybeUri;
}
