// *****************************************************************************
// Copyright (C) 2026 akhilp19 and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { injectable, inject, optional } from '@theia/core/shared/inversify';
import { RemoteConnectionService } from '@theia/remote/lib/electron-node/remote-connection-service';
import { RemoteConnection } from '@theia/remote/lib/electron-node/remote-types';
import { CommandResult, runStreamingCommand as localRunStreamingCommand } from './process-utils';

export const BuildExecutor = Symbol('BuildExecutor');

export interface BuildExecutor {
    /**
     * Run a command and optionally stream output line-by-line.
     *
     * @param command the executable
     * @param args arguments
     * @param cwd working directory
     * @param connectionId optional remote connection identifier. If omitted or not found, runs locally.
     * @param onOutput optional line callback
     */
    run(
        command: string,
        args: string[],
        cwd: string,
        connectionId?: string,
        onOutput?: (line: string) => void
    ): Promise<CommandResult>;
}

@injectable()
export class LocalBuildExecutor implements BuildExecutor {

    async run(
        command: string,
        args: string[],
        cwd: string,
        _connectionId?: string,
        onOutput?: (line: string) => void
    ): Promise<CommandResult> {
        return localRunStreamingCommand(command, args, cwd, onOutput);
    }
}

@injectable()
export class RemoteAwareBuildExecutor implements BuildExecutor {

    @inject(LocalBuildExecutor)
    protected readonly local: LocalBuildExecutor;

    @inject(RemoteConnectionService) @optional()
    protected readonly remoteConnectionService?: RemoteConnectionService;

    async run(
        command: string,
        args: string[],
        cwd: string,
        connectionId?: string,
        onOutput?: (line: string) => void
    ): Promise<CommandResult> {
        const connection = (connectionId && this.remoteConnectionService)
            ? this.remoteConnectionService.getConnection(connectionId)
            : undefined;
        if (!connection) {
            return this.local.run(command, args, cwd, connectionId, onOutput);
        }

        const result = await connection.exec(command, args, { env: process.env });

        if (onOutput) {
            const lines = (result.stdout + result.stderr).split(/\r?\n/);
            for (const line of lines) {
                if (line.length > 0) {
                    onOutput(line);
                }
            }
        }

        return {
            exitCode: 0,
            stdout: result.stdout,
            stderr: result.stderr
        };
    }
}

/**
 * Extract a connection identifier from a Theia remote workspace URI.
 *
 * Theia remote URIs commonly follow the pattern `vscode-remote://<connection-id>/<path>`
 * or `theia-remote://<connection-id>/<path>`. This helper returns the connection id
 * or `undefined` for local `file://` URIs.
 */
export function getRemoteConnectionId(uri: string): string | undefined {
    if (uri.startsWith('file://')) {
        return undefined;
    }

    try {
        const parsed = new URL(uri);
        return parsed.hostname || parsed.username || undefined;
    } catch {
        return undefined;
    }
}

export function getRemoteConnection(service: RemoteConnectionService | undefined, uri: string): RemoteConnection | undefined {
    const id = getRemoteConnectionId(uri);
    if (!id || !service) {
        return undefined;
    }
    return service.getConnection(id);
}
