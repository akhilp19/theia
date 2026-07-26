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
import { CppBuildServer, CppBuildClient, DetectedBuildSystem } from '../common/cpp-build-protocol';
import { BuildConfigurationOptions, BuildTarget, DebugLaunchInfo } from '../common/build-system-model';
import { BuildSystemRegistry } from './build-system-registry';

@injectable()
export class CppBuildServerImpl implements CppBuildServer {

    @inject(BuildSystemRegistry)
    protected readonly registry: BuildSystemRegistry;

    protected client?: CppBuildClient;
    protected readonly systems = new Map<string, Awaited<ReturnType<BuildSystemRegistry['detect']>>>();

    setClient(client: CppBuildClient): void {
        this.client = client;
    }

    dispose(): void {
        this.client = undefined;
        this.systems.clear();
    }

    protected async getBuildSystem(root: string) {
        let system = this.systems.get(root);
        if (!system) {
            system = await this.registry.detect(new URI(root));
            if (system) {
                this.systems.set(root, system);
            }
        }
        return system;
    }

    async detectBuildSystem(root: string): Promise<DetectedBuildSystem | undefined> {
        const system = await this.getBuildSystem(root);
        if (!system) {
            return undefined;
        }
        const compileCommandsPath = await system.getCompileCommandsPath();
        return {
            type: system.type,
            name: system.name,
            buildDirectory: system.buildDirectory?.toString(),
            compileCommandsPath: compileCommandsPath?.toString()
        };
    }

    async getConfigurationOptions(root: string): Promise<BuildConfigurationOptions[]> {
        const system = await this.getBuildSystem(root);
        if (!system || !system.getConfigurationOptions) {
            return [];
        }
        return system.getConfigurationOptions();
    }

    async getCompileCommandsPath(root: string, options?: BuildConfigurationOptions): Promise<string | undefined> {
        const system = await this.getBuildSystem(root);
        if (!system) {
            return undefined;
        }
        const path = await system.getCompileCommandsPath(options);
        return path?.toString();
    }

    async getBuildTargets(root: string, options?: BuildConfigurationOptions): Promise<BuildTarget[]> {
        const system = await this.getBuildSystem(root);
        if (!system || !system.getBuildTargets) {
            return [];
        }
        return system.getBuildTargets(options);
    }

    async configure(root: string, options?: BuildConfigurationOptions): Promise<void> {
        const system = await this.getBuildSystem(root);
        if (!system || !system.configure) {
            throw new Error('Configure is not supported for the detected build system.');
        }
        this.client?.onBuildEvent(root, { type: 'started' });
        try {
            await system.configure(options);
            this.client?.onBuildEvent(root, { type: 'finished' });
        } catch (err) {
            this.client?.onBuildEvent(root, { type: 'failed', message: String(err) });
            throw err;
        }
    }

    async build(root: string, options?: BuildConfigurationOptions): Promise<void> {
        const system = await this.getBuildSystem(root);
        if (!system || !system.build) {
            throw new Error('Build is not supported for the detected build system.');
        }
        this.client?.onBuildEvent(root, { type: 'started' });
        try {
            await system.build(options);
            this.client?.onBuildEvent(root, { type: 'finished' });
        } catch (err) {
            this.client?.onBuildEvent(root, { type: 'failed', message: String(err) });
            throw err;
        }
    }

    async clean(root: string, options?: BuildConfigurationOptions): Promise<void> {
        const system = await this.getBuildSystem(root);
        if (!system || !system.clean) {
            throw new Error('Clean is not supported for the detected build system.');
        }
        this.client?.onBuildEvent(root, { type: 'started' });
        try {
            await system.clean(options);
            this.client?.onBuildEvent(root, { type: 'finished' });
        } catch (err) {
            this.client?.onBuildEvent(root, { type: 'failed', message: String(err) });
            throw err;
        }
    }

    async getDebugInfo(root: string, targetName: string, options?: BuildConfigurationOptions): Promise<DebugLaunchInfo | undefined> {
        const system = await this.getBuildSystem(root);
        if (!system || !system.getBuildTargets) {
            return undefined;
        }
        const targets = await system.getBuildTargets(options);
        const target = targets.find(t => t.name === targetName);
        if (!target || !system.getDebugInfo) {
            return undefined;
        }
        return system.getDebugInfo(target);
    }
}
