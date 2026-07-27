// *****************************************************************************
// Copyright (C) 2026 akhilp19 and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { RpcServer } from '@theia/core/lib/common/messaging';

export interface CompilerInfo {
    readonly name: string;
    readonly path: string;
    readonly version?: string;
    readonly target?: string;
    readonly language: 'c' | 'cpp';
}

export interface DebuggerInfo {
    readonly name: string;
    readonly path: string;
    readonly version?: string;
}

export interface BuildToolInfo {
    readonly name: string;
    readonly path: string;
    readonly version?: string;
}

export interface PackageManagerInfo {
    readonly name: string;
    readonly path: string;
    readonly version?: string;
    readonly root?: string;
}

export interface ToolchainReport {
    readonly compilers: CompilerInfo[];
    readonly debuggers: DebuggerInfo[];
    readonly buildTools: BuildToolInfo[];
    readonly packageManagers: PackageManagerInfo[];
    readonly missing: string[];
}

export interface ProjectConfigurationProposal {
    readonly buildSystem?: string;
    readonly canGenerateCMakePresets: boolean;
    readonly cmakePresetsContent?: string;
    readonly clangdContent?: string;
    readonly warnings: string[];
}

export interface OnboardingResult {
    readonly success: boolean;
    readonly message: string;
    readonly generatedFiles: string[];
    readonly warnings: string[];
}

export const CppOnboardingServer = Symbol('CppOnboardingServer');

export interface CppOnboardingServer extends RpcServer<undefined> {
    detectToolchain(root: string): Promise<ToolchainReport>;
    proposeConfiguration(root: string): Promise<ProjectConfigurationProposal>;
    applyConfiguration(root: string, proposal: ProjectConfigurationProposal): Promise<OnboardingResult>;
}

export const cppOnboardingPath = '/services/cpp-onboarding';
