// *****************************************************************************
// Copyright (C) 2026 akhilp19 and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { ContainerModule } from '@theia/core/shared/inversify';
import { bindRootContributionProvider } from '@theia/core/lib/common';
import { ConnectionHandler, RpcConnectionHandler } from '@theia/core/lib/common/messaging';
import { CppBuildServer, CppBuildClient, cppBuildPath } from '../common/cpp-build-protocol';
import { CppBuildServerImpl } from './cpp-build-server';
import { BuildSystemRegistry } from './build-system-registry';
import { BuildSystemAdapter } from './build-system-adapter';
import { CMakeBuildSystemAdapter } from './adapters/cmake-adapter';
import { BazelBuildSystemAdapter } from './adapters/bazel-adapter';
import { MesonBuildSystemAdapter } from './adapters/meson-adapter';
import { MakeBuildSystemAdapter } from './adapters/make-adapter';

export default new ContainerModule(bind => {
    bind(CppBuildServerImpl).toSelf().inSingletonScope();
    bind(CppBuildServer).toService(CppBuildServerImpl);
    bind(BuildSystemRegistry).toSelf().inSingletonScope();

    bindRootContributionProvider(bind, BuildSystemAdapter);
    bind(BuildSystemAdapter).to(CMakeBuildSystemAdapter).inSingletonScope();
    bind(BuildSystemAdapter).to(BazelBuildSystemAdapter).inSingletonScope();
    bind(BuildSystemAdapter).to(MesonBuildSystemAdapter).inSingletonScope();
    bind(BuildSystemAdapter).to(MakeBuildSystemAdapter).inSingletonScope();

    bind(ConnectionHandler).toDynamicValue(ctx =>
        new RpcConnectionHandler<CppBuildClient>(cppBuildPath, client => {
            const server = ctx.container.get<CppBuildServer>(CppBuildServer);
            server.setClient(client);
            client.onDidCloseConnection(() => server.dispose());
            return server;
        })
    ).inSingletonScope();
});
