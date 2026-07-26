// *****************************************************************************
// Copyright (C) 2026 akhilp19 and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { ContainerModule } from '@theia/core/shared/inversify';
import { CommandContribution, MenuContribution } from '@theia/core/lib/common';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { WebSocketConnectionProvider } from '@theia/core/lib/browser/messaging';
import { PreferenceContribution } from '@theia/core/lib/common/preferences';
import { cppBuildPreferenceSchema } from '../common/cpp-build-preferences';
import { CppBuildServer, CppBuildClient, cppBuildPath } from '../common/cpp-build-protocol';
import { CppBuildFrontendContribution } from './cpp-build-frontend-contribution';
import { CppBuildService } from './cpp-build-service';
import { CppBuildStatusBarContribution } from './cpp-build-status-bar-contribution';

export default new ContainerModule(bind => {
    bind(CppBuildService).toSelf().inSingletonScope();
    bind(CppBuildFrontendContribution).toSelf().inSingletonScope();
    bind(CppBuildStatusBarContribution).toSelf().inSingletonScope();

    for (const identifier of [FrontendApplicationContribution, CommandContribution, MenuContribution]) {
        bind(identifier).toService(CppBuildFrontendContribution);
    }

    bind(FrontendApplicationContribution).toService(CppBuildStatusBarContribution);

    bind(PreferenceContribution).toConstantValue({ schema: cppBuildPreferenceSchema });

    bind(CppBuildServer).toDynamicValue(ctx => {
        const connection = ctx.container.get(WebSocketConnectionProvider);
        const client: CppBuildClient = ctx.container.get(CppBuildService);
        return connection.createProxy<CppBuildServer>(cppBuildPath, client);
    }).inSingletonScope();
});
