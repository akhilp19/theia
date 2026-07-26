// *****************************************************************************
// Copyright (C) 2026 akhilp19 and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { injectable, inject } from '@theia/core/shared/inversify';
import { ContributionProvider } from '@theia/core/lib/common';
import URI from '@theia/core/lib/common/uri';
import { BuildSystem } from '../common/build-system-model';
import { BuildSystemAdapter } from './build-system-adapter';

@injectable()
export class BuildSystemRegistry {

    @inject(ContributionProvider)
    @inject(BuildSystemAdapter)
    protected readonly adapters: ContributionProvider<BuildSystemAdapter>;

    async detect(root: URI): Promise<BuildSystem | undefined> {
        const candidates: { adapter: BuildSystemAdapter; canHandle: boolean }[] = [];
        for (const adapter of this.adapters.getContributions()) {
            const handled = await adapter.canHandle(root);
            candidates.push({ adapter, canHandle: handled });
        }

        const sorted = candidates
            .filter(c => c.canHandle)
            .sort((a, b) => b.adapter.priority - a.adapter.priority);

        if (sorted.length === 0) {
            return undefined;
        }

        return sorted[0].adapter.createBuildSystem(root);
    }
}
