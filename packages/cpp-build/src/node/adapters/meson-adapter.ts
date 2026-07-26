// *****************************************************************************
// Copyright (C) 2026 akhilp19 and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { injectable } from '@theia/core/shared/inversify';
import URI from '@theia/core/lib/common/uri';
import { promises as fs } from 'fs';
import * as path from 'path';
import { BuildSystemAdapter } from '../build-system-adapter';
import { BuildConfigurationOptions, BuildSystem, BuildSystemType, CompileCommand } from '../../common/build-system-model';
import { exists, getWorkspaceRootPath, runCommand } from '../process-utils';

@injectable()
export class MesonBuildSystemAdapter implements BuildSystemAdapter {

    readonly id = 'meson';
    readonly name = 'Meson';
    readonly priority = 80;

    async canHandle(root: URI): Promise<boolean> {
        return exists(root.resolve('meson.build'));
    }

    async createBuildSystem(root: URI): Promise<BuildSystem> {
        return new MesonBuildSystem(root);
    }
}

export class MesonBuildSystem implements BuildSystem {

    readonly type: BuildSystemType = 'meson';
    readonly name = 'Meson';

    constructor(
        readonly root: URI,
        readonly buildDirectory?: URI
    ) {
        this.buildDirectory = buildDirectory ?? root.resolve('builddir');
    }

    async detect(): Promise<boolean> {
        return true;
    }

    async getConfigurationOptions(): Promise<BuildConfigurationOptions[]> {
        return [{ variant: 'debug' }, { variant: 'release' }];
    }

    async configure(options?: BuildConfigurationOptions): Promise<void> {
        console.log(`Configuring Meson project at ${this.root.toString()} with variant ${options?.variant ?? 'debug'}`);
    }

    async build(options?: BuildConfigurationOptions): Promise<void> {
        console.log(`Building Meson project at ${this.root.toString()}, target ${options?.target ?? 'all'}`);
    }

    async clean(): Promise<void> {
        const rootPath = getWorkspaceRootPath(this.root.toString());
        const buildDir = this.buildDirectory ? getWorkspaceRootPath(this.buildDirectory.toString()) : path.join(rootPath, 'builddir');
        const result = await runCommand('meson', ['compile', '--clean', '-C', buildDir], rootPath);
        if (result.exitCode !== 0) {
            throw new Error(`Meson clean failed: ${result.stderr || result.stdout}`);
        }
    }

    async getCompileCommandsPath(): Promise<URI | undefined> {
        const path = this.buildDirectory!.resolve('compile_commands.json');
        if (await exists(path)) {
            return path;
        }
        return undefined;
    }

    async getBuildTargets?(): Promise<BuildTarget[]> {
        return [];
    }
}

async function exists(uri: URI): Promise<boolean> {
    try {
        const stat = await fs.stat(uri.path.toString());
        return stat.isFile();
    } catch {
        return false;
    }
}
