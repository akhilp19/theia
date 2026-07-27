// *****************************************************************************
// Copyright (C) 2026 akhilp19 and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { ContainerModule } from '@theia/core/shared/inversify';
import { ConnectionHandler, RpcConnectionHandler } from '@theia/core/lib/common/messaging';
import { CppOnboardingServer, cppOnboardingPath } from '../../common/cpp-onboarding-protocol';
import { CppOnboardingServerImpl } from './cpp-onboarding-server';
import { ToolchainDetector } from './toolchain-detector';
import { ProjectConfigGenerator } from './project-config-generator';

export default new ContainerModule(bind => {
    bind(CppOnboardingServerImpl).toSelf().inSingletonScope();
    bind(CppOnboardingServer).toService(CppOnboardingServerImpl);

    bind(ToolchainDetector).toSelf().inSingletonScope();
    bind(ProjectConfigGenerator).toSelf().inSingletonScope();

    bind(ConnectionHandler).toDynamicValue(ctx =>
        new RpcConnectionHandler<undefined>(cppOnboardingPath, () => {
            const server = ctx.container.get<CppOnboardingServer>(CppOnboardingServer);
            return server;
        })
    ).inSingletonScope();
});
