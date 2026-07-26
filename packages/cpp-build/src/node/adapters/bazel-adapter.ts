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
export class BazelBuildSystemAdapter implements BuildSystemAdapter {

    readonly id = 'bazel';
    readonly name = 'Bazel';
    readonly priority = 90;

    async canHandle(root: URI): Promise<boolean> {
        return exists(root.resolve('WORKSPACE')) || exists(root.resolve('WORKSPACE.bazel')) || exists(root.resolve('MODULE.bazel'));
    }

    async createBuildSystem(root: URI): Promise<BuildSystem> {
        return new BazelBuildSystem(root);
    }
}

export class BazelBuildSystem implements BuildSystem {

    readonly type: BuildSystemType = 'bazel';
    readonly name = 'Bazel';
    readonly buildDirectory?: URI;

    constructor(
        readonly root: URI
    ) { }

    async detect(): Promise<boolean> {
        return true;
    }

    async getConfigurationOptions(): Promise<BuildConfigurationOptions[]> {
        return [{ target: '//...' }];
    }

    async build(options?: BuildConfigurationOptions): Promise<void> {
        console.log(`Building Bazel project at ${this.root.toString()}, target ${options?.target ?? '//...'}`);
    }

    async clean(): Promise<void> {
        const rootPath = getWorkspaceRootPath(this.root.toString());
        const result = await runCommand('bazel', ['clean'], rootPath);
        if (result.exitCode !== 0) {
            throw new Error(`Bazel clean failed: ${result.stderr || result.stdout}`);
        }
    }

    async getCompileCommandsPath(): Promise<URI | undefined> {
        const path = this.root.resolve('compile_commands.json');
        return (await exists(path)) ? path : undefined;
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
