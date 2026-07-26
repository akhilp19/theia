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
import URI from '@theia/core/lib/common/uri';
import { RemoteConnection } from '@theia/remote/lib/electron-node/remote-types';

export interface CommandResult {
    readonly exitCode: number;
    readonly stdout: string;
    readonly stderr: string;
}

export function runCommand(command: string, args: string[], cwd?: string): Promise<CommandResult> {
    return runStreamingCommand(command, args, cwd);
}

export function runStreamingCommand(
    command: string,
    args: string[],
    cwd: string | undefined,
    onOutput?: (line: string) => void
): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd,
            shell: process.platform === 'win32'
        });

        let stdout = '';
        let stderr = '';

        const capture = (data: Buffer | string, into: 'stdout' | 'stderr') => {
            const chunk = data.toString();
            const combined = into === 'stdout' ? stdout : stderr;
            const updated = combined + chunk;
            if (into === 'stdout') {
                stdout = updated;
            } else {
                stderr = updated;
            }

            if (onOutput) {
                const lines = chunk.split(/\r?\n/);
                for (const line of lines) {
                    if (line.length > 0) {
                        onOutput(line);
                    }
                }
            }
        };

        child.stdout?.on('data', data => capture(data, 'stdout'));
        child.stderr?.on('data', data => capture(data, 'stderr'));

        child.on('error', reject);
        child.on('close', exitCode => {
            resolve({ exitCode: exitCode ?? -1, stdout, stderr });
        });
    });
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
    // Theia URIs may be file://, vscode-remote://, etc. For execution on the target host,
    // strip the scheme and return the filesystem path.
    if (maybeUri.startsWith('file://')) {
        return fileURLToPath(maybeUri);
    }

    try {
        const parsed = new URL(maybeUri);
        return parsed.pathname || maybeUri;
    } catch {
        return maybeUri;
    }
}

function toLocalPath(maybeUri: string | URI): string {
    if (maybeUri instanceof URI) {
        return getWorkspaceRootPath(maybeUri.toString());
    }
    return getWorkspaceRootPath(maybeUri);
}

export async function exists(filePath: string): Promise<boolean> {
    try {
        const stat = await fs.stat(filePath);
        return stat.isFile() || stat.isDirectory();
    } catch {
        return false;
    }
}

/**
 * Check whether a URI exists on the target filesystem (local or remote).
 */
export async function fileExists(uri: URI, connection?: RemoteConnection): Promise<boolean> {
    if (!connection) {
        return exists(toLocalPath(uri));
    }
    const remotePath = getWorkspaceRootPath(uri.toString());
    const result = await connection.exec('test', ['-e', remotePath]);
    // `test` writes nothing on stdout/stderr; treat any output as unexpected failure.
    return result.stdout.length === 0 && result.stderr.length === 0;
}

/**
 * Read a file from the target filesystem (local or remote).
 */
export async function readFile(uri: URI, connection?: RemoteConnection): Promise<string | undefined> {
    if (!connection) {
        try {
            return await fs.readFile(toLocalPath(uri), 'utf-8');
        } catch {
            return undefined;
        }
    }
    const remotePath = getWorkspaceRootPath(uri.toString());
    const result = await connection.exec('cat', [remotePath]);
    return result.stdout;
}

/**
 * Write a file to the target filesystem (local or remote).
 */
export async function writeFile(uri: URI, content: string, connection?: RemoteConnection): Promise<void> {
    if (!connection) {
        await fs.writeFile(toLocalPath(uri), content, 'utf-8');
        return;
    }
    const remotePath = getWorkspaceRootPath(uri.toString());
    // Encode content as base64 and decode on the remote host to avoid shell-escaping issues.
    const base64 = Buffer.from(content, 'utf-8').toString('base64');
    const result = await connection.exec('sh', ['-c', `printf '%s\\n' "${base64}" | base64 -d > "${remotePath}"`]);
    if (result.stderr.length > 0) {
        throw new Error(`Failed to write remote file ${remotePath}: ${result.stderr}`);
    }
}

export async function readJson<T>(uri: URI, connection?: RemoteConnection): Promise<T | undefined> {
    const content = await readFile(uri, connection);
    if (!content) {
        return undefined;
    }
    try {
        return JSON.parse(content) as T;
    } catch {
        return undefined;
    }
}

export async function writeClangdConfig(workspaceRoot: URI | string, compileCommandsDir: string, connection?: RemoteConnection): Promise<void> {
    const rootPath = toLocalPath(workspaceRoot);
    const clangdUri = typeof workspaceRoot === 'string' ? URI.fromFilePath(path.join(rootPath, '.clangd')) : workspaceRoot.resolve('.clangd');
    const content = `# Auto-generated by Theia C/C++ Build extension\n` +
        `# Do not edit manually unless you know what you are doing.\n` +
        `CompileFlags:\n` +
        `  CompilationDatabase: ${compileCommandsDir}\n`;
    await writeFile(clangdUri, content, connection);
}

export async function readClangdConfig(workspaceRoot: URI | string, connection?: RemoteConnection): Promise<string | undefined> {
    const rootPath = toLocalPath(workspaceRoot);
    const clangdUri = typeof workspaceRoot === 'string' ? URI.fromFilePath(path.join(rootPath, '.clangd')) : workspaceRoot.resolve('.clangd');
    return readFile(clangdUri, connection);
}
