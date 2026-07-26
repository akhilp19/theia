// *****************************************************************************
// Copyright (C) 2026 akhilp19 and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import URI from '@theia/core/lib/common/uri';

export type BuildSystemType = 'cmake' | 'bazel' | 'meson' | 'make' | 'msbuild' | 'qmake' | 'custom';

export interface CompileCommand {
    directory: string;
    command?: string;
    arguments?: string[];
    file: string;
    output?: string;
}

export interface BuildTarget {
    readonly name: string;
    readonly type: 'executable' | 'library' | 'test' | 'custom';
    readonly sourceFiles: string[];
    readonly outputPath?: string;
    readonly compileCommands: CompileCommand[];
}

export interface BuildPreset {
    readonly name: string;
    readonly displayName?: string;
    readonly description?: string;
    readonly variant?: string;
    readonly buildDirectory?: string;
}

export interface BuildSystem {
    readonly type: BuildSystemType;
    readonly name: string;
    readonly root: URI;
    readonly buildDirectory?: URI;
    detect(): Promise<boolean>;
    getConfigurationOptions?(): Promise<BuildConfigurationOptions[]>;
    configure?(options?: BuildConfigurationOptions): Promise<void>;
    build?(options?: BuildConfigurationOptions): Promise<void>;
    clean?(options?: BuildConfigurationOptions): Promise<void>;
    getCompileCommandsPath(options?: BuildConfigurationOptions): Promise<URI | undefined>;
    getBuildTargets?(options?: BuildConfigurationOptions): Promise<BuildTarget[]>;
    getDebugInfo?(target: BuildTarget): Promise<DebugLaunchInfo | undefined>;
}

export interface BuildConfigurationOptions {
    readonly variant?: 'Debug' | 'Release' | 'RelWithDebInfo' | 'MinSizeRel' | string;
    readonly preset?: string;
    readonly target?: string;
    readonly extraArgs?: string[];
    readonly onOutput?: (line: string) => void;
}

export interface DebugLaunchInfo {
    readonly program: string;
    readonly args?: string[];
    readonly cwd?: string;
    readonly debugger: 'gdb' | 'lldb' | 'cppvsdbg' | string;
    readonly debuggerPath?: string;
    readonly environment?: Record<string, string | null | undefined>;
}
