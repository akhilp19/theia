// *****************************************************************************
// Copyright (C) 2026 akhilp19 and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { injectable, inject } from '@theia/core/shared/inversify';
import URI from '@theia/core/lib/common/uri';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { BuildSystemAdapter } from '../build-system-adapter';
import { BuildConfigurationOptions, BuildSystem, BuildSystemType, CompileCommand } from '../../common/build-system-model';

@injectable()
export class BazelBuildSystemAdapter implements BuildSystemAdapter {

    readonly id = 'bazel';
    readonly name = 'Bazel';
    readonly priority = 90;

    @inject(FileService)
    protected readonly fileService: FileService;

    async canHandle(root: URI): Promise<boolean> {
        return this.exists(root.resolve('WORKSPACE')) || this.exists(root.resolve('WORKSPACE.bazel')) || this.exists(root.resolve('MODULE.bazel'));
    }

    async createBuildSystem(root: URI): Promise<BuildSystem> {
        return new BazelBuildSystem(root, this.fileService);
    }

    protected async exists(uri: URI): Promise<boolean> {
        try {
            const stat = await this.fileService.resolve(uri);
            return !stat.isDirectory;
        } catch {
            return false;
        }
    }
}

export class BazelBuildSystem implements BuildSystem {

    readonly type: BuildSystemType = 'bazel';
    readonly name = 'Bazel';
    readonly buildDirectory?: URI;

    constructor(
        readonly root: URI,
        protected readonly fileService: FileService
    ) { }

    async detect(): Promise<boolean> {
        return true;
    }

    async build(options?: BuildConfigurationOptions): Promise<void> {
        console.log(`Building Bazel project at ${this.root.toString()}, target ${options?.target ?? '//...'}`);
    }

    async getCompileCommandsPath(): Promise<URI | undefined> {
        // Placeholder: Bazel typically requires a custom aspect to generate compile_commands.json.
        return this.root.resolve('compile_commands.json');
    }

    async getBuildTargets?(): Promise<{ name: string; type: 'executable' | 'library' | 'test' | 'custom'; sourceFiles: string[]; compileCommands: CompileCommand[] }[]> {
        return [];
    }
}
