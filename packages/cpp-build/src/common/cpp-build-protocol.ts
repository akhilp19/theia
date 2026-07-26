// *****************************************************************************
// Copyright (C) 2026 akhilp19 and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { RpcServer } from '@theia/core/lib/common/messaging';
import { BuildSystemType, BuildTarget, BuildConfigurationOptions, DebugLaunchInfo } from './build-system-model';

export const cppBuildPath = '/services/cpp-build';

export interface DetectedBuildSystem {
    readonly type: BuildSystemType;
    readonly name: string;
    readonly buildDirectory?: string;
    readonly compileCommandsPath?: string;
}

export const CppBuildServer = Symbol('CppBuildServer');
export interface CppBuildServer extends RpcServer<CppBuildClient> {
    detectBuildSystem(root: string): Promise<DetectedBuildSystem | undefined>;
    getConfigurationOptions(root: string): Promise<BuildConfigurationOptions[]>;
    getCompileCommandsPath(root: string, options?: BuildConfigurationOptions): Promise<string | undefined>;
    getBuildTargets(root: string, options?: BuildConfigurationOptions): Promise<BuildTarget[]>;
    configure(root: string, options?: BuildConfigurationOptions): Promise<void>;
    build(root: string, options?: BuildConfigurationOptions): Promise<void>;
    clean(root: string, options?: BuildConfigurationOptions): Promise<void>;
    getDebugInfo(root: string, targetName: string, options?: BuildConfigurationOptions): Promise<DebugLaunchInfo | undefined>;
    dispose(): void;
}

export const CppBuildClient = Symbol('CppBuildClient');
export interface CppBuildClient {
    onBuildOutput(root: string, data: string): void;
    onBuildEvent(root: string, event: { type: 'started' | 'finished' | 'failed'; message?: string }): void;
}

export interface CppBuildServerInit {
    readonly rootUri: string;
}
