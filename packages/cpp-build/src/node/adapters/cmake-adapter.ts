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
import {
    BuildConfigurationOptions,
    BuildPreset,
    BuildSystem,
    BuildSystemType,
    BuildTarget,
    CompileCommand,
    DebugLaunchInfo
} from '../../common/build-system-model';
import { exists, getWorkspaceRootPath, readJson, runCommand } from '../process-utils';

interface CMakeConfigurePreset {
    name: string;
    displayName?: string;
    description?: string;
    generator?: string;
    binaryDir?: string;
    cacheVariables?: Record<string, unknown>;
}

interface CMakeBuildPreset {
    name: string;
    displayName?: string;
    description?: string;
    configurePreset?: string;
    inherits?: string | string[];
    jobs?: number;
    targets?: string | string[];
}

interface CMakePresetsFile {
    version: number;
    configurePresets?: CMakeConfigurePreset[];
    buildPresets?: CMakeBuildPreset[];
}

@injectable()
export class CMakeBuildSystemAdapter implements BuildSystemAdapter {

    readonly id = 'cmake';
    readonly name = 'CMake';
    readonly priority = 100;

    async canHandle(root: URI): Promise<boolean> {
        return exists(path.join(getWorkspaceRootPath(root.toString()), 'CMakeLists.txt'));
    }

    async createBuildSystem(root: URI): Promise<BuildSystem> {
        return CMakeBuildSystem.detect(root);
    }
}

export class CMakeBuildSystem implements BuildSystem {

    readonly type: BuildSystemType = 'cmake';
    readonly name = 'CMake';

    protected configurePresets: CMakeConfigurePreset[] = [];
    protected buildPresets: CMakeBuildPreset[] = [];

    protected constructor(
        readonly root: URI,
        readonly buildDirectory?: URI
    ) { }

    static async detect(root: URI): Promise<CMakeBuildSystem> {
        const rootPath = getWorkspaceRootPath(root.toString());

        const presetsPath = path.join(rootPath, 'CMakePresets.json');
        const userPresetsPath = path.join(rootPath, 'CMakeUserPresets.json');

        const system = new CMakeBuildSystem(root);
        await system.loadPresets(presetsPath);
        await system.loadPresets(userPresetsPath);

        // If no presets, fall back to a default build directory.
        if (!system.buildDirectory && system.configurePresets.length === 0) {
            system.buildDirectory = root.resolve('build');
        }

        return system;
    }

    async detect(): Promise<boolean> {
        return true;
    }

    async getConfigurationOptions(): Promise<BuildConfigurationOptions[]> {
        if (this.configurePresets.length > 0) {
            return this.configurePresets.map(preset => ({
                preset: preset.name,
                variant: this.inferVariant(preset),
                target: undefined
            }));
        }

        // Fallback to standard CMake build variants.
        return [
            { variant: 'Debug' },
            { variant: 'Release' },
            { variant: 'RelWithDebInfo' },
            { variant: 'MinSizeRel' }
        ];
    }

    async configure(options?: BuildConfigurationOptions): Promise<void> {
        const rootPath = getWorkspaceRootPath(this.root.toString());
        const args = ['-S', rootPath];

        const buildDir = this.resolveBuildDirectory(options);
        args.push('-B', buildDir);

        if (options?.preset) {
            args.push('--preset', options.preset);
        } else {
            const variant = options?.variant ?? 'Debug';
            args.push('-DCMAKE_BUILD_TYPE=' + variant);
        }

        const result = await runCommand('cmake', args, rootPath);
        if (result.exitCode !== 0) {
            throw new Error(`CMake configure failed: ${result.stderr || result.stdout}`);
        }
    }

    async build(options?: BuildConfigurationOptions): Promise<void> {
        const rootPath = getWorkspaceRootPath(this.root.toString());
        const buildDir = this.resolveBuildDirectory(options);
        const args = ['--build', buildDir];

        if (options?.target) {
            args.push('--target', options.target);
        }

        if (options?.variant && !options?.preset) {
            args.push('--config', options.variant);
        }

        const result = await runCommand('cmake', args, rootPath);
        if (result.exitCode !== 0) {
            throw new Error(`CMake build failed: ${result.stderr || result.stdout}`);
        }
    }

    async getCompileCommandsPath(options?: BuildConfigurationOptions): Promise<URI | undefined> {
        const buildDir = this.resolveBuildDirectory(options);
        const candidate = path.join(buildDir, 'compile_commands.json');
        if (await exists(candidate)) {
            return URI.fromFilePath(candidate);
        }

        // Some generators place it under the source tree.
        const rootPath = getWorkspaceRootPath(this.root.toString());
        const fallback = path.join(rootPath, 'compile_commands.json');
        if (await exists(fallback)) {
            return URI.fromFilePath(fallback);
        }

        return undefined;
    }

    async getBuildTargets(options?: BuildConfigurationOptions): Promise<BuildTarget[]> {
        const compileCommandsPath = await this.getCompileCommandsPath(options);
        if (!compileCommandsPath) {
            return [];
        }

        const commands = await readJson<CompileCommand[]>(compileCommandsPath.path.toString());
        if (!commands) {
            return [];
        }

        const byOutput = new Map<string, CompileCommand[]>();
        for (const command of commands) {
            const output = command.output || command.file;
            const list = byOutput.get(output) || [];
            list.push(command);
            byOutput.set(output, list);
        }

        return Array.from(byOutput.entries()).map(([output, cmds]) => ({
            name: path.basename(output, path.extname(output)),
            type: this.inferTargetType(output),
            sourceFiles: cmds.map(cmd => cmd.file),
            outputPath: output,
            compileCommands: cmds
        }));
    }

    async getDebugInfo(target: BuildTarget): Promise<DebugLaunchInfo | undefined> {
        if (!target.outputPath) {
            return undefined;
        }

        return {
            program: target.outputPath,
            cwd: getWorkspaceRootPath(this.root.toString()),
            debugger: process.platform === 'win32' ? 'cppvsdbg' : 'gdb'
        };
    }

    protected async loadPresets(filePath: string): Promise<void> {
        const presets = await readJson<CMakePresetsFile>(filePath);
        if (!presets) {
            return;
        }

        if (presets.configurePresets) {
            this.configurePresets.push(...presets.configurePresets);
        }
        if (presets.buildPresets) {
            this.buildPresets.push(...presets.buildPresets);
        }
    }

    protected resolveBuildDirectory(options?: BuildConfigurationOptions): string {
        const preset = options?.preset
            ? this.configurePresets.find(p => p.name === options.preset)
            : undefined;

        if (preset?.binaryDir) {
            return path.isAbsolute(preset.binaryDir)
                ? preset.binaryDir
                : path.join(getWorkspaceRootPath(this.root.toString()), preset.binaryDir);
        }

        if (this.buildDirectory) {
            return getWorkspaceRootPath(this.buildDirectory.toString()).replace(/^file:\/\//, '');
        }

        return path.join(getWorkspaceRootPath(this.root.toString()), 'build');
    }

    protected inferVariant(preset: CMakeConfigurePreset): string | undefined {
        const cache = preset.cacheVariables;
        if (cache && typeof cache['CMAKE_BUILD_TYPE'] === 'string') {
            return cache['CMAKE_BUILD_TYPE'];
        }
        return undefined;
    }

    protected inferTargetType(outputPath: string): 'executable' | 'library' | 'test' | 'custom' {
        if (outputPath.includes('test') || outputPath.includes('Test')) {
            return 'test';
        }
        const ext = path.extname(outputPath).toLowerCase();
        if (ext === '.so' || ext === '.dll' || ext === '.dylib' || ext === '.a' || ext === '.lib') {
            return 'library';
        }
        return 'executable';
    }
}
