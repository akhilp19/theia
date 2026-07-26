// *****************************************************************************
// Copyright (C) 2026 akhilp19 and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { PreferenceSchema, PreferenceProxy, PreferenceScope } from '@theia/core/lib/common/preferences';

export const cppBuildPreferenceSchema: PreferenceSchema = {
    type: 'object',
    scope: 'resource',
    properties: {
        'cpp.build.preferredGenerator': {
            type: 'string',
            default: '',
            description: 'Preferred CMake generator (e.g., "Ninja", "Unix Makefiles", "Visual Studio 17 2022").'
        },
        'cpp.build.defaultVariant': {
            type: 'string',
            enum: ['Debug', 'Release', 'RelWithDebInfo', 'MinSizeRel'],
            default: 'Debug',
            description: 'Default build variant when configuring CMake projects.'
        },
        'cpp.build.autoConfigure': {
            type: 'boolean',
            default: true,
            description: 'Automatically configure the project when a build system is detected.'
        },
        'cpp.build.compileCommandsLocation': {
            type: 'string',
            default: '${workspaceFolder}/build/compile_commands.json',
            description: 'Path to the compilation database. Used as fallback when the build system cannot report it.'
        },
        'cpp.build.enableStatusBar': {
            type: 'boolean',
            default: true,
            description: 'Show the active C/C++ build system in the status bar.'
        }
    }
};

export interface CppBuildConfiguration {
    'cpp.build.preferredGenerator': string;
    'cpp.build.defaultVariant': 'Debug' | 'Release' | 'RelWithDebInfo' | 'MinSizeRel';
    'cpp.build.autoConfigure': boolean;
    'cpp.build.compileCommandsLocation': string;
    'cpp.build.enableStatusBar': boolean;
}

export const CppBuildPreferences = Symbol('CppBuildPreferences');
export type CppBuildPreferences = PreferenceProxy<CppBuildConfiguration>;
