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
import {
    ProjectConfigurationProposal,
    ToolchainReport
} from '../../common/cpp-onboarding-protocol';
import { fileExists, readJson, writeFile } from '../process-utils';
import { BuildExecutor, getRemoteConnection, getRemoteConnectionId } from '../build-executor';
import { RemoteConnectionService } from '@theia/remote/lib/electron-node/remote-connection-service';
import { optional } from '@theia/core/shared/inversify';

interface CMakePresetsFile {
    version: number;
    configurePresets?: Array<{
        name: string;
        displayName?: string;
        generator?: string;
        binaryDir?: string;
        cacheVariables?: Record<string, unknown>;
    }>;
}

@injectable()
export class ProjectConfigGenerator {

    @inject(BuildExecutor)
    protected readonly executor: BuildExecutor;

    @inject(RemoteConnectionService) @optional()
    protected readonly remoteConnectionService?: RemoteConnectionService;

    async propose(root: URI, toolchain: ToolchainReport): Promise<ProjectConfigurationProposal> {
        const connection = getRemoteConnection(this.remoteConnectionService, root.toString());
        const hasCMakeLists = await fileExists(root.resolve('CMakeLists.txt'), connection);
        const existingPresets = await readJson<CMakePresetsFile>(root.resolve('CMakePresets.json'), connection);
        const warnings: string[] = [];

        if (!hasCMakeLists) {
            warnings.push('No CMakeLists.txt found. Onboarding can scaffold a minimal one, but this iteration only generates CMakePresets.json for existing CMake projects.');
        }

        if (existingPresets?.configurePresets && existingPresets.configurePresets.length > 0) {
            return {
                buildSystem: 'cmake',
                canGenerateCMakePresets: false,
                clangdContent: this.generateClangdContent(root),
                warnings: ['CMakePresets.json already exists; skipping preset generation.']
            };
        }

        const generator = this.inferGenerator(toolchain);
        const cCompiler = toolchain.compilers.find(c => c.language === 'c');
        const cppCompiler = toolchain.compilers.find(c => c.language === 'cpp');

        if (!cCompiler && !cppCompiler) {
            warnings.push('No C or C++ compiler detected. Configure a compiler before building.');
        }

        const cmakePresetsContent = this.generateCMakePresets({
            generator,
            cCompiler: cCompiler?.path,
            cppCompiler: cppCompiler?.path
        });

        return {
            buildSystem: hasCMakeLists ? 'cmake' : undefined,
            canGenerateCMakePresets: hasCMakeLists,
            cmakePresetsContent: hasCMakeLists ? cmakePresetsContent : undefined,
            clangdContent: this.generateClangdContent(root),
            warnings
        };
    }

    async apply(root: URI, proposal: ProjectConfigurationProposal): Promise<string[]> {
        const generated: string[] = [];
        const connection = getRemoteConnection(this.remoteConnectionService, root.toString());

        if (proposal.canGenerateCMakePresets && proposal.cmakePresetsContent) {
            const presetsUri = root.resolve('CMakePresets.json');
            await writeFile(presetsUri, proposal.cmakePresetsContent, connection);
            generated.push(presetsUri.toString());
        }

        if (proposal.clangdContent) {
            const clangdUri = root.resolve('.clangd');
            await writeFile(clangdUri, proposal.clangdContent, connection);
            generated.push(clangdUri.toString());
        }

        return generated;
    }

    protected inferGenerator(toolchain: ToolchainReport): string {
        if (toolchain.buildTools.some(t => t.name === 'ninja')) {
            return 'Ninja';
        }
        if (process.platform === 'win32') {
            return 'Visual Studio 17 2022';
        }
        return 'Unix Makefiles';
    }

    protected generateCMakePresets(options: { generator: string; cCompiler?: string; cppCompiler?: string }): string {
        const cacheVariables: Record<string, unknown> = {};
        if (options.cCompiler) {
            cacheVariables['CMAKE_C_COMPILER'] = options.cCompiler;
        }
        if (options.cppCompiler) {
            cacheVariables['CMAKE_CXX_COMPILER'] = options.cppCompiler;
        }

        const preset = {
            version: 3,
            configurePresets: [{
                name: 'default',
                displayName: 'Default Config',
                generator: options.generator,
                binaryDir: '${sourceDir}/build',
                cacheVariables
            }]
        };

        return JSON.stringify(preset, undefined, 4);
    }

    protected generateClangdContent(root: URI): string {
        return '# Auto-generated by Theia C/C++ Build extension\n' +
            '# Do not edit manually unless you know what you are doing.\n' +
            'CompileFlags:\n' +
            '  CompilationDatabase: build\n';
    }
}
