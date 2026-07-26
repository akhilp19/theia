// *****************************************************************************
// Copyright (C) 2026 akhilp19 and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { RpcServer } from '@theia/core/lib/common/messaging';
import URI from '@theia/core/lib/common/uri';
import { BuildSystemType, BuildTarget, BuildConfigurationOptions, DebugLaunchInfo } from './build-system-model';

export const cppBuildPath = '/services/cpp-build';

export const CppBuildServer = Symbol('CppBuildServer');
export interface CppBuildServer extends RpcServer<CppBuildClient> {
    detectBuildSystem(root: string): Promise<BuildSystemType | undefined>;
    getCompileCommandsPath(root: string): Promise<string | undefined>;
    getBuildTargets(root: string): Promise<BuildTarget[]>;
    configure(root: string, options?: BuildConfigurationOptions): Promise<void>;
    build(root: string, options?: BuildConfigurationOptions): Promise<void>;
    getDebugInfo(root: string, targetName: string): Promise<DebugLaunchInfo | undefined>;
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
