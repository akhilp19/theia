// *****************************************************************************
// Copyright (C) 2026 akhilp19 and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { injectable, inject } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution, StatusBar } from '@theia/core/lib/browser';
import { CppBuildService } from './cpp-build-service';

@injectable()
export class CppBuildStatusBarContribution implements FrontendApplicationContribution {

    @inject(StatusBar)
    protected readonly statusBar: StatusBar;

    @inject(CppBuildService)
    protected readonly buildService: CppBuildService;

    async initialize(): Promise<void> {
        this.buildService.onActiveBuildSystemChanged(system => {
            if (system) {
                this.statusBar.setElement('cpp-build-system', {
                    text: `$(tools) C/C++: ${system.type}`,
                    tooltip: `Detected C/C++ build system: ${system.type}`,
                    alignment: 1,
                    priority: 100
                });
            } else {
                this.statusBar.removeElement('cpp-build-system');
            }
        });
    }
}
