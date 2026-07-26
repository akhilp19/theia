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
export class MakeBuildSystemAdapter implements BuildSystemAdapter {

    readonly id = 'make';
    readonly name = 'Make';
    readonly priority = 10;

    @inject(FileService)
    protected readonly fileService: FileService;

    async canHandle(root: URI): Promise<boolean> {
        return this.exists(root.resolve('Makefile')) || this.exists(root.resolve('makefile'));
    }

    async createBuildSystem(root: URI): Promise<BuildSystem> {
        return new MakeBuildSystem(root, this.fileService);
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

export class MakeBuildSystem implements BuildSystem {

    readonly type: BuildSystemType = 'make';
    readonly name = 'Make';
    readonly buildDirectory?: URI;

    constructor(
        readonly root: URI,
        protected readonly fileService: FileService
    ) { }

    async detect(): Promise<boolean> {
        return true;
    }

    async build(options?: BuildConfigurationOptions): Promise<void> {
        console.log(`Building Make project at ${this.root.toString()}, target ${options?.target ?? 'all'}`);
    }

    async getCompileCommandsPath(): Promise<URI | undefined> {
        const candidates = [
            this.root.resolve('compile_commands.json'),
            this.root.resolve('build/compile_commands.json')
        ];
        for (const path of candidates) {
            if (await this.exists(path)) {
                return path;
            }
        }
        return undefined;
    }

    async getBuildTargets?(): Promise<{ name: string; type: 'executable' | 'library' | 'test' | 'custom'; sourceFiles: string[]; compileCommands: CompileCommand[] }[]> {
        return [];
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
