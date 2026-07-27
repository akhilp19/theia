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
    CppOnboardingServer,
    OnboardingResult,
    ProjectConfigurationProposal,
    ToolchainReport
} from '../../common/cpp-onboarding-protocol';
import { ToolchainDetector } from './toolchain-detector';
import { ProjectConfigGenerator } from './project-config-generator';

@injectable()
export class CppOnboardingServerImpl implements CppOnboardingServer {

    @inject(ToolchainDetector)
    protected readonly toolchainDetector: ToolchainDetector;

    @inject(ProjectConfigGenerator)
    protected readonly configGenerator: ProjectConfigGenerator;

    async detectToolchain(root: string): Promise<ToolchainReport> {
        return this.toolchainDetector.detect(new URI(root));
    }

    async proposeConfiguration(root: string): Promise<ProjectConfigurationProposal> {
        const toolchain = await this.toolchainDetector.detect(new URI(root));
        return this.configGenerator.propose(new URI(root), toolchain);
    }

    async applyConfiguration(root: string, proposal: ProjectConfigurationProposal): Promise<OnboardingResult> {
        const warnings = [...proposal.warnings];
        try {
            const generated = await this.configGenerator.apply(new URI(root), proposal);
            return {
                success: true,
                message: generated.length > 0
                    ? `Generated project configuration files: ${generated.join(', ')}`
                    : 'No files were generated.',
                generatedFiles: generated,
                warnings
            };
        } catch (err) {
            return {
                success: false,
                message: `Failed to apply project configuration: ${String(err)}`,
                generatedFiles: [],
                warnings
            };
        }
    }
}
