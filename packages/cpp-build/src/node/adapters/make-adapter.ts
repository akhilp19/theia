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
import { BuildSystemAdapter } from '../build-system-adapter';
import { BuildConfigurationOptions, BuildSystem, BuildSystemType, CompileCommand } from '../../common/build-system-model';
import { exists, getWorkspaceRootPath, runCommand } from '../process-utils';

@injectable()
export class MakeBuildSystemAdapter implements BuildSystemAdapter {

    readonly id = 'make';
    readonly name = 'Make';
    readonly priority = 10;

    async canHandle(root: URI): Promise<boolean> {
        return exists(root.resolve('Makefile')) || exists(root.resolve('makefile'));
    }

    async createBuildSystem(root: URI): Promise<BuildSystem> {
        return new MakeBuildSystem(root);
    }
}

export class MakeBuildSystem implements BuildSystem {

    readonly type: BuildSystemType = 'make';
    readonly name = 'Make';
    readonly buildDirectory?: URI;

    constructor(
        readonly root: URI
    ) { }

    async detect(): Promise<boolean> {
        return true;
    }

    async getConfigurationOptions(): Promise<BuildConfigurationOptions[]> {
        return [{ target: 'all' }];
    }

    async build(options?: BuildConfigurationOptions): Promise<void> {
        console.log(`Building Make project at ${this.root.toString()}, target ${options?.target ?? 'all'}`);
    }

    async clean(): Promise<void> {
        const rootPath = getWorkspaceRootPath(this.root.toString());
        const result = await runCommand('make', ['clean'], rootPath);
        if (result.exitCode !== 0) {
            throw new Error(`Make clean failed: ${result.stderr || result.stdout}`);
        }
    }

    async getCompileCommandsPath(): Promise<URI | undefined> {
        const candidates = [
            this.root.resolve('compile_commands.json'),
            this.root.resolve('build/compile_commands.json')
        ];
        for (const path of candidates) {
            if (await exists(path)) {
                return path;
            }
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
