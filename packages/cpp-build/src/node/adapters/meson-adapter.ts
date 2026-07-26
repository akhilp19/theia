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
export class MesonBuildSystemAdapter implements BuildSystemAdapter {

    readonly id = 'meson';
    readonly name = 'Meson';
    readonly priority = 80;

    @inject(FileService)
    protected readonly fileService: FileService;

    async canHandle(root: URI): Promise<boolean> {
        return this.exists(root.resolve('meson.build'));
    }

    async createBuildSystem(root: URI): Promise<BuildSystem> {
        return new MesonBuildSystem(root, this.fileService);
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

export class MesonBuildSystem implements BuildSystem {

    readonly type: BuildSystemType = 'meson';
    readonly name = 'Meson';

    constructor(
        readonly root: URI,
        protected readonly fileService: FileService,
        readonly buildDirectory?: URI
    ) {
        this.buildDirectory = buildDirectory ?? root.resolve('builddir');
    }

    async detect(): Promise<boolean> {
        return true;
    }

    async configure(options?: BuildConfigurationOptions): Promise<void> {
        console.log(`Configuring Meson project at ${this.root.toString()} with variant ${options?.variant ?? 'debug'}`);
    }

    async build(options?: BuildConfigurationOptions): Promise<void> {
        console.log(`Building Meson project at ${this.root.toString()}, target ${options?.target ?? 'all'}`);
    }

    async getCompileCommandsPath(): Promise<URI | undefined> {
        const path = this.buildDirectory!.resolve('compile_commands.json');
        if (await this.exists(path)) {
            return path;
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
