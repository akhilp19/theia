// *****************************************************************************
// Copyright (C) 2026 akhilp19 and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { injectable, inject, optional } from '@theia/core/shared/inversify';
import URI from '@theia/core/lib/common/uri';
import { RemoteConnectionService } from '@theia/remote/lib/electron-node/remote-connection-service';
import { RemoteConnection } from '@theia/remote/lib/electron-node/remote-types';
import { BuildSystemAdapter } from '../build-system-adapter';
import { BuildConfigurationOptions, BuildSystem, BuildSystemType, BuildTarget } from '../../common/build-system-model';
import { BuildExecutor, getRemoteConnection, getRemoteConnectionId } from '../build-executor';
import { fileExists, getWorkspaceRootPath } from '../process-utils';

@injectable()
export class MakeBuildSystemAdapter implements BuildSystemAdapter {

    readonly id = 'make';
    readonly name = 'Make';
    readonly priority = 10;

    @inject(BuildExecutor)
    protected readonly executor: BuildExecutor;

    @inject(RemoteConnectionService) @optional()
    protected readonly remoteConnectionService?: RemoteConnectionService;

    async canHandle(root: URI): Promise<boolean> {
        const connection = getRemoteConnection(this.remoteConnectionService, root.toString());
        return fileExists(root.resolve('Makefile'), connection) || fileExists(root.resolve('makefile'), connection);
    }

    async createBuildSystem(root: URI): Promise<BuildSystem> {
        return new MakeBuildSystem(root, this.executor, this.remoteConnectionService);
    }
}

export class MakeBuildSystem implements BuildSystem {

    readonly type: BuildSystemType = 'make';
    readonly name = 'Make';
    readonly buildDirectory?: URI;

    constructor(
        readonly root: URI,
        protected readonly executor: BuildExecutor,
        protected readonly remoteConnectionService?: RemoteConnectionService
    ) { }

    protected get connectionId(): string | undefined {
        return getRemoteConnectionId(this.root.toString());
    }

    protected get connection(): RemoteConnection | undefined {
        return getRemoteConnection(this.remoteConnectionService, this.root.toString());
    }

    async detect(): Promise<boolean> {
        return true;
    }

    async getConfigurationOptions(): Promise<BuildConfigurationOptions[]> {
        return [{ target: 'all' }];
    }

    async build(options?: BuildConfigurationOptions): Promise<void> {
        const rootPath = getWorkspaceRootPath(this.root.toString());
        const target = options?.target ?? 'all';
        const result = await this.executor.run('make', [target], rootPath, this.connectionId, options?.onOutput);
        if (result.exitCode !== 0) {
            throw new Error(`Make build failed: ${result.stderr || result.stdout}`);
        }
    }

    async clean(options?: BuildConfigurationOptions): Promise<void> {
        const rootPath = getWorkspaceRootPath(this.root.toString());
        const result = await this.executor.run('make', ['clean'], rootPath, this.connectionId, options?.onOutput);
        if (result.exitCode !== 0) {
            throw new Error(`Make clean failed: ${result.stderr || result.stdout}`);
        }
    }

    async getCompileCommandsPath(): Promise<URI | undefined> {
        const candidates = [
            this.root.resolve('compile_commands.json'),
            this.root.resolve('build/compile_commands.json')
        ];
        for (const candidate of candidates) {
            if (await fileExists(candidate, this.connection)) {
                return candidate;
            }
        }
        return undefined;
    }

    async getBuildTargets?(): Promise<BuildTarget[]> {
        return [];
    }
}
