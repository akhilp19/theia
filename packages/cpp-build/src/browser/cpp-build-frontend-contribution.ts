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
import { FrontendApplicationContribution, QuickInputService, QuickPickItem } from '@theia/core/lib/browser';
import { WorkspaceService } from '@theia/workspace/lib/browser/workspace-service';
import { CppBuildService } from './cpp-build-service';
import { BuildConfigurationOptions, BuildTarget } from '../common/build-system-model';

export namespace CppBuildCommands {
    export const DETECT_BUILD_SYSTEM = {
        id: 'cppBuild.detectBuildSystem',
        label: nls.localize('theia/cpp-build/detectBuildSystem', 'C/C++: Detect Build System')
    };
    export const SELECT_PRESET = {
        id: 'cppBuild.selectPreset',
        label: nls.localize('theia/cpp-build/selectPreset', 'C/C++: Select Build Preset')
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
    export const SHOW_BUILD_TARGETS = {
        id: 'cppBuild.showBuildTargets',
        label: nls.localize('theia/cpp-build/showBuildTargets', 'C/C++: Show Build Targets')
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

    @inject(QuickInputService)
    protected readonly quickInputService: QuickInputService;

    protected activeOptions = new Map<string, BuildConfigurationOptions>();

    async initialize(): Promise<void> {
        this.workspaceService.onWorkspaceChanged(async roots => {
            if (roots.length > 0) {
                const root = roots[0].resource;
                try {
                    const detected = await this.buildService.detectBuildSystem(root);
                    if (detected) {
                        this.messageService.info(`Detected C/C++ build system: ${detected.name} (${detected.type})`);
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
                const detected = await this.buildService.detectBuildSystem(root);
                if (detected) {
                    this.messageService.info(
                        `Detected ${detected.name} (${detected.type})` +
                        (detected.compileCommandsPath ? ` — compile_commands: ${detected.compileCommandsPath}` : '')
                    );
                } else {
                    this.messageService.warn('No supported C/C++ build system found.');
                }
            }
        });

        commands.registerCommand(CppBuildCommands.SELECT_PRESET, {
            execute: async () => {
                const root = this.getWorkspaceRoot();
                if (!root) {
                    this.messageService.warn('No workspace open.');
                    return;
                }
                const options = await this.buildService.getConfigurationOptions(root);
                if (options.length === 0) {
                    this.messageService.warn('No build presets or variants available.');
                    return;
                }

                const selected = await this.quickInputService.showQuickPick(
                    options.map(option => this.toQuickPickOption(option)),
                    { placeHolder: 'Select a build preset or variant' }
                );

                if (selected) {
                    this.activeOptions.set(root.toString(), selected);
                    this.messageService.info(`Active build option: ${this.formatOption(selected)}`);
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
                const options = this.activeOptions.get(root.toString());
                await this.buildService.configure(root, options);
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
                const options = this.activeOptions.get(root.toString());
                await this.buildService.build(root, options);
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
                const options = this.activeOptions.get(root.toString());
                const path = await this.buildService.getCompileCommandsPath(root, options);
                if (path) {
                    this.messageService.info(`Compile commands: ${path.toString()}`);
                } else {
                    this.messageService.warn('No compile_commands.json found. Run configure first.');
                }
            }
        });

        commands.registerCommand(CppBuildCommands.SHOW_BUILD_TARGETS, {
            execute: async () => {
                const root = this.getWorkspaceRoot();
                if (!root) {
                    this.messageService.warn('No workspace open.');
                    return;
                }
                const options = this.activeOptions.get(root.toString());
                const targets = await this.buildService.getBuildTargets(root, options);
                if (targets.length === 0) {
                    this.messageService.warn('No build targets found. Run configure/build first.');
                    return;
                }
                this.messageService.info(`Build targets: ${targets.map(t => t.name).join(', ')}`);
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

    protected toQuickPickOption(option: BuildConfigurationOptions): QuickPickItem & { option: BuildConfigurationOptions } {
        return {
            label: this.formatOption(option),
            option
        };
    }

    protected formatOption(option: BuildConfigurationOptions): string {
        const parts: string[] = [];
        if (option.preset) {
            parts.push(`preset: ${option.preset}`);
        }
        if (option.variant) {
            parts.push(`variant: ${option.variant}`);
        }
        if (option.target) {
            parts.push(`target: ${option.target}`);
        }
        return parts.length > 0 ? parts.join(', ') : 'default';
    }
}
