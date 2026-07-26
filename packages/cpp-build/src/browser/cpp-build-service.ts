// *****************************************************************************
// Copyright (C) 2026 akhilp19 and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { injectable, inject } from '@theia/core/shared/inversify';
import { Emitter } from '@theia/core/lib/common';
import URI from '@theia/core/lib/common/uri';
import { CppBuildClient, CppBuildServer, DetectedBuildSystem } from '../common/cpp-build-protocol';
import { BuildConfigurationOptions, BuildSystemType, BuildTarget, DebugLaunchInfo } from '../common/build-system-model';

export interface ActiveBuildSystem {
    root: URI;
    type: BuildSystemType;
    name: string;
    buildDirectory?: string;
    compileCommandsPath?: string;
}

@injectable()
export class CppBuildService implements CppBuildClient {

    @inject(CppBuildServer)
    protected readonly server: CppBuildServer;

    protected readonly onActiveBuildSystemChangedEmitter = new Emitter<ActiveBuildSystem | undefined>();
    readonly onActiveBuildSystemChanged = this.onActiveBuildSystemChangedEmitter.event;

    protected readonly onBuildOutputEmitter = new Emitter<{ root: URI; data: string }>();
    readonly onBuildOutput = this.onBuildOutputEmitter.event;

    protected activeBuildSystem?: ActiveBuildSystem;

    async detectBuildSystem(root: URI): Promise<DetectedBuildSystem | undefined> {
        const detected = await this.server.detectBuildSystem(root.toString());
        if (detected) {
            this.activeBuildSystem = {
                root,
                type: detected.type,
                name: detected.name,
                buildDirectory: detected.buildDirectory,
                compileCommandsPath: detected.compileCommandsPath
            };
            this.onActiveBuildSystemChangedEmitter.fire(this.activeBuildSystem);
        }
        return detected;
    }

    async getConfigurationOptions(root: URI): Promise<BuildConfigurationOptions[]> {
        return this.server.getConfigurationOptions(root.toString());
    }

    async getCompileCommandsPath(root: URI, options?: BuildConfigurationOptions): Promise<URI | undefined> {
        const path = await this.server.getCompileCommandsPath(root.toString(), options);
        return path ? new URI(path) : undefined;
    }

    async getBuildTargets(root: URI, options?: BuildConfigurationOptions): Promise<BuildTarget[]> {
        return this.server.getBuildTargets(root.toString(), options);
    }

    async configure(root: URI, options?: BuildConfigurationOptions): Promise<void> {
        await this.server.configure(root.toString(), options);
    }

    async build(root: URI, options?: BuildConfigurationOptions): Promise<void> {
        await this.server.build(root.toString(), options);
    }

    async clean(root: URI, options?: BuildConfigurationOptions): Promise<void> {
        await this.server.clean(root.toString(), options);
    }

    async getDebugInfo(root: URI, targetName: string, options?: BuildConfigurationOptions): Promise<DebugLaunchInfo | undefined> {
        return this.server.getDebugInfo(root.toString(), targetName, options);
    }

    onBuildOutput(root: string, data: string): void {
        this.onBuildOutputEmitter.fire({ root: new URI(root), data });
    }

    onBuildEvent(root: string, event: { type: 'started' | 'finished' | 'failed'; message?: string }): void {
        if (event.type === 'failed') {
            console.error(`C/C++ build failed for ${root}:`, event.message);
        }
    }

    getActiveBuildSystem(): ActiveBuildSystem | undefined {
        return this.activeBuildSystem;
    }
}
