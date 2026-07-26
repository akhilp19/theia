// *****************************************************************************
// Copyright (C) 2026 akhilp19 and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { injectable, inject } from '@theia/core/shared/inversify';
import {
    CommandContribution,
    CommandRegistry,
    MenuContribution,
    MenuModelRegistry,
    MessageService,
    nls
} from '@theia/core/lib/common';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { WorkspaceService } from '@theia/workspace/lib/browser/workspace-service';
import { CppBuildService } from './cpp-build-service';

export namespace CppBuildCommands {
    export const DETECT_BUILD_SYSTEM = {
        id: 'cppBuild.detectBuildSystem',
        label: nls.localize('theia/cpp-build/detectBuildSystem', 'C/C++: Detect Build System')
    };
    export const CONFIGURE = {
        id: 'cppBuild.configure',
        label: nls.localize('theia/cpp-build/configure', 'C/C++: Configure Project')
    };
    export const BUILD = {
        id: 'cppBuild.build',
        label: nls.localize('theia/cpp-build/build', 'C/C++: Build Project')
    };
    export const SHOW_COMPILE_COMMANDS_PATH = {
        id: 'cppBuild.showCompileCommandsPath',
        label: nls.localize('theia/cpp-build/showCompileCommandsPath', 'C/C++: Show Compile Commands Path')
    };
}

@injectable()
export class CppBuildFrontendContribution implements CommandContribution, MenuContribution, FrontendApplicationContribution {

    @inject(CppBuildService)
    protected readonly buildService: CppBuildService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(MessageService)
    protected readonly messageService: MessageService;

    async initialize(): Promise<void> {
        this.workspaceService.onWorkspaceChanged(async roots => {
            if (roots.length > 0) {
                const root = roots[0].resource;
                try {
                    const type = await this.buildService.detectBuildSystem(root);
                    if (type) {
                        this.messageService.info(`Detected C/C++ build system: ${type}`);
                    }
                } catch (err) {
                    console.error('Failed to detect C/C++ build system:', err);
                }
            }
        });
    }

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(CppBuildCommands.DETECT_BUILD_SYSTEM, {
            execute: async () => {
                const root = this.getWorkspaceRoot();
                if (!root) {
                    this.messageService.warn('No workspace open.');
                    return;
                }
                const type = await this.buildService.detectBuildSystem(root);
                if (type) {
                    this.messageService.info(`Detected C/C++ build system: ${type}`);
                } else {
                    this.messageService.warn('No supported C/C++ build system found.');
                }
            }
        });

        commands.registerCommand(CppBuildCommands.CONFIGURE, {
            execute: async () => {
                const root = this.getWorkspaceRoot();
                if (!root) {
                    this.messageService.warn('No workspace open.');
                    return;
                }
                await this.buildService.configure(root);
                this.messageService.info('C/C++ project configured.');
            }
        });

        commands.registerCommand(CppBuildCommands.BUILD, {
            execute: async () => {
                const root = this.getWorkspaceRoot();
                if (!root) {
                    this.messageService.warn('No workspace open.');
                    return;
                }
                await this.buildService.build(root);
                this.messageService.info('C/C++ build finished.');
            }
        });

        commands.registerCommand(CppBuildCommands.SHOW_COMPILE_COMMANDS_PATH, {
            execute: async () => {
                const root = this.getWorkspaceRoot();
                if (!root) {
                    this.messageService.warn('No workspace open.');
                    return;
                }
                const path = await this.buildService.getCompileCommandsPath(root);
                if (path) {
                    this.messageService.info(`Compile commands: ${path.toString()}`);
                } else {
                    this.messageService.warn('No compile_commands.json found.');
                }
            }
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        // Placeholder: register commands under a future Terminal/Run menu contribution point.
    }

    protected getWorkspaceRoot() {
        const roots = this.workspaceService.tryGetRoots();
        return roots.length > 0 ? roots[0].resource : undefined;
    }
}
