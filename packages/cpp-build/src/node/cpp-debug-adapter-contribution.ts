// *****************************************************************************
// Copyright (C) 2026 akhilp19 and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { injectable } from '@theia/core/shared/inversify';
import { DebugAdapterContribution, DebugAdapterExecutable, DebugConfiguration } from '@theia/debug/lib/common/debug-model';

@injectable()
export class CppDebugAdapterContribution implements DebugAdapterContribution {

    readonly type = 'cppdbg';
    readonly label = 'C/C++ GDB/LLDB';

    async provideDebugConfigurations(_workspaceFolderUri?: string): Promise<DebugConfiguration[]> {
        return [
            {
                type: this.type,
                request: 'launch',
                name: 'C/C++: Launch current target',
                program: '${command:cpptools.activeConfigName}',
                cwd: '${workspaceFolder}',
                stopAtEntry: false,
                externalConsole: false,
                MIMode: 'gdb'
            }
        ];
    }

    async provideDebugAdapterExecutable(config: DebugConfiguration): Promise<DebugAdapterExecutable | undefined> {
        const debuggerPath = this.resolveDebuggerPath(config);
        if (!debuggerPath) {
            return undefined;
        }
        return {
            command: debuggerPath,
            args: ['--interpreter=mi']
        };
    }

    async resolveDebugConfiguration(config: DebugConfiguration, _workspaceFolderUri?: string): Promise<DebugConfiguration | undefined> {
        if (!config.program) {
            return undefined;
        }

        config.MIMode = config.MIMode ?? this.defaultMIMode();
        config.miDebuggerPath = config.miDebuggerPath ?? this.resolveDebuggerPath(config);
        config.cwd = config.cwd ?? '${workspaceFolder}';
        config.args = config.args ?? [];
        config.environment = config.environment ?? [];
        config.stopAtEntry = config.stopAtEntry ?? false;
        config.externalConsole = config.externalConsole ?? false;
        return config;
    }

    protected resolveDebuggerPath(config: DebugConfiguration): string | undefined {
        if (config.miDebuggerPath) {
            return config.miDebuggerPath;
        }
        if (config.MIMode === 'lldb') {
            return process.platform === 'darwin' ? '/usr/bin/lldb' : 'lldb';
        }
        if (process.platform === 'win32') {
            return 'gdb.exe';
        }
        return 'gdb';
    }

    protected defaultMIMode(): string {
        return process.platform === 'darwin' ? 'lldb' : 'gdb';
    }
}
