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
import * as path from 'path';
import { RemoteConnectionService } from '@theia/remote/lib/electron-node/remote-connection-service';
import { RemoteConnection } from '@theia/remote/lib/electron-node/remote-types';
import { BuildSystemAdapter } from '../build-system-adapter';
import { BuildConfigurationOptions, BuildSystem, BuildSystemType, BuildTarget } from '../../common/build-system-model';
import { BuildExecutor, getRemoteConnection, getRemoteConnectionId } from '../build-executor';
import { fileExists, getWorkspaceRootPath } from '../process-utils';

@injectable()
export class MesonBuildSystemAdapter implements BuildSystemAdapter {

    readonly id = 'meson';
    readonly name = 'Meson';
    readonly priority = 80;

    @inject(BuildExecutor)
    protected readonly executor: BuildExecutor;

    @inject(RemoteConnectionService) @optional()
    protected readonly remoteConnectionService?: RemoteConnectionService;

    async canHandle(root: URI): Promise<boolean> {
        const connection = getRemoteConnection(this.remoteConnectionService, root.toString());
        return fileExists(root.resolve('meson.build'), connection);
    }

    async createBuildSystem(root: URI): Promise<BuildSystem> {
        return new MesonBuildSystem(root, this.executor, this.remoteConnectionService);
    }
}

export class MesonBuildSystem implements BuildSystem {

    readonly type: BuildSystemType = 'meson';
    readonly name = 'Meson';

    constructor(
        readonly root: URI,
        protected readonly executor: BuildExecutor,
        protected readonly remoteConnectionService?: RemoteConnectionService,
        readonly buildDirectory?: URI
    ) {
        this.buildDirectory = buildDirectory ?? root.resolve('builddir');
    }

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
        return [{ variant: 'debug' }, { variant: 'release' }];
    }

    async configure(options?: BuildConfigurationOptions): Promise<void> {
        const rootPath = getWorkspaceRootPath(this.root.toString());
        const buildDir = this.buildDirectory ? getWorkspaceRootPath(this.buildDirectory.toString()) : path.join(rootPath, 'builddir');
        const result = await this.executor.run('meson', ['setup', buildDir, rootPath], rootPath, this.connectionId, options?.onOutput);
        if (result.exitCode !== 0) {
            throw new Error(`Meson configure failed: ${result.stderr || result.stdout}`);
        }
    }

    async build(options?: BuildConfigurationOptions): Promise<void> {
        const rootPath = getWorkspaceRootPath(this.root.toString());
        const buildDir = this.buildDirectory ? getWorkspaceRootPath(this.buildDirectory.toString()) : path.join(rootPath, 'builddir');
        const args = options?.target ? ['compile', '-C', buildDir, options.target] : ['compile', '-C', buildDir];
        const result = await this.executor.run('meson', args, rootPath, this.connectionId, options?.onOutput);
        if (result.exitCode !== 0) {
            throw new Error(`Meson build failed: ${result.stderr || result.stdout}`);
        }
    }

    async clean(options?: BuildConfigurationOptions): Promise<void> {
        const rootPath = getWorkspaceRootPath(this.root.toString());
        const buildDir = this.buildDirectory ? getWorkspaceRootPath(this.buildDirectory.toString()) : path.join(rootPath, 'builddir');
        const result = await this.executor.run('meson', ['compile', '--clean', '-C', buildDir], rootPath, this.connectionId, options?.onOutput);
        if (result.exitCode !== 0) {
            throw new Error(`Meson clean failed: ${result.stderr || result.stdout}`);
        }
    }

    async getCompileCommandsPath(): Promise<URI | undefined> {
        const candidate = this.buildDirectory!.resolve('compile_commands.json');
        if (await fileExists(candidate, this.connection)) {
            return candidate;
        }
        return undefined;
    }

    async getBuildTargets?(): Promise<BuildTarget[]> {
        return [];
    }
}
