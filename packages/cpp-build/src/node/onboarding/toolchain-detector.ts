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
    ToolchainReport,
    CompilerInfo,
    DebuggerInfo,
    BuildToolInfo,
    PackageManagerInfo
} from '../../common/cpp-onboarding-protocol';
import { BuildExecutor, getRemoteConnectionId } from '../build-executor';
import { getWorkspaceRootPath } from '../process-utils';

interface ToolCandidate {
    name: string;
    command: string;
    args: string[];
    parseVersion: (stdout: string) => string | undefined;
    language?: 'c' | 'cpp';
}

const COMPILER_CANDIDATES: ToolCandidate[] = [
    { name: 'gcc', command: 'gcc', args: ['--version'], parseVersion: parseFirstLine, language: 'c' },
    { name: 'g++', command: 'g++', args: ['--version'], parseVersion: parseFirstLine, language: 'cpp' },
    { name: 'clang', command: 'clang', args: ['--version'], parseVersion: parseClangVersion, language: 'c' },
    { name: 'clang++', command: 'clang++', args: ['--version'], parseVersion: parseClangVersion, language: 'cpp' }
];

const DEBUGGER_CANDIDATES: ToolCandidate[] = [
    { name: 'gdb', command: 'gdb', args: ['--version'], parseVersion: parseFirstLine },
    { name: 'lldb', command: 'lldb', args: ['--version'], parseVersion: parseFirstLine }
];

const BUILD_TOOL_CANDIDATES: ToolCandidate[] = [
    { name: 'cmake', command: 'cmake', args: ['--version'], parseVersion: parseCMakeVersion },
    { name: 'ninja', command: 'ninja', args: ['--version'], parseVersion: line => line.trim() },
    { name: 'make', command: 'make', args: ['--version'], parseVersion: parseFirstLine },
    { name: 'meson', command: 'meson', args: ['--version'], parseVersion: line => line.trim() },
    { name: 'bazel', command: 'bazel', args: ['--version'], parseVersion: line => line.trim() }
];

const PACKAGE_MANAGER_CANDIDATES: ToolCandidate[] = [
    { name: 'vcpkg', command: 'vcpkg', args: ['--version'], parseVersion: parseFirstLine },
    { name: 'conan', command: 'conan', args: ['--version'], parseVersion: parseFirstLine }
];

@injectable()
export class ToolchainDetector {

    @inject(BuildExecutor)
    protected readonly executor: BuildExecutor;

    async detect(root: URI): Promise<ToolchainReport> {
        const cwd = getWorkspaceRootPath(root.toString());
        const connectionId = getRemoteConnectionId(root.toString());

        const [compilers, debuggers, buildTools, packageManagers, missing] = await Promise.all([
            this.detectGroup(COMPILER_CANDIDATES, cwd, connectionId),
            this.detectGroup(DEBUGGER_CANDIDATES, cwd, connectionId),
            this.detectGroup(BUILD_TOOL_CANDIDATES, cwd, connectionId),
            this.detectGroup(PACKAGE_MANAGER_CANDIDATES, cwd, connectionId),
            this.checkRecommended(COMPILER_CANDIDATES, BUILD_TOOL_CANDIDATES, cwd, connectionId)
        ]);

        return {
            compilers: compilers as CompilerInfo[],
            debuggers: debuggers as DebuggerInfo[],
            buildTools: buildTools as BuildToolInfo[],
            packageManagers: packageManagers as PackageManagerInfo[],
            missing
        };
    }

    protected async detectGroup(candidates: ToolCandidate[], cwd: string, connectionId?: string): Promise<Array<CompilerInfo | DebuggerInfo | BuildToolInfo | PackageManagerInfo>> {
        const found: Array<CompilerInfo | DebuggerInfo | BuildToolInfo | PackageManagerInfo> = [];
        for (const candidate of candidates) {
            const info = await this.detectTool(candidate, cwd, connectionId);
            if (info) {
                found.push(info);
            }
        }
        return found;
    }

    protected async detectTool(candidate: ToolCandidate, cwd: string, connectionId?: string): Promise<CompilerInfo | DebuggerInfo | BuildToolInfo | PackageManagerInfo | undefined> {
        try {
            const result = await this.executor.run(candidate.command, candidate.args, cwd, connectionId);
            if (result.exitCode !== 0) {
                return undefined;
            }
            const firstLine = result.stdout.split(/\r?\n/)[0] ?? '';
            return {
                name: candidate.name,
                path: candidate.command,
                version: candidate.parseVersion(firstLine),
                ...(candidate.language ? { language: candidate.language } : {})
            } as CompilerInfo | DebuggerInfo | BuildToolInfo | PackageManagerInfo;
        } catch {
            return undefined;
        }
    }

    protected async checkRecommended(compilers: ToolCandidate[], buildTools: ToolCandidate[], cwd: string, connectionId?: string): Promise<string[]> {
        const missing: string[] = [];
        const all = [
            ...compilers.map(c => ({ ...c, category: 'compiler' })),
            ...buildTools.filter(c => c.name === 'cmake' || c.name === 'ninja').map(c => ({ ...c, category: 'build tool' }))
        ];
        for (const candidate of all) {
            const info = await this.detectTool(candidate, cwd, connectionId);
            if (!info) {
                missing.push(candidate.name);
            }
        }
        return missing;
    }
}

function parseFirstLine(line: string): string | undefined {
    const trimmed = line.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function parseClangVersion(line: string): string | undefined {
    // clang version 14.0.0
    const match = line.match(/clang version ([^\s]+)/i);
    return match?.[1];
}

function parseCMakeVersion(line: string): string | undefined {
    // cmake version 3.28.0
    const match = line.match(/cmake version ([^\s]+)/i);
    return match?.[1];
}
