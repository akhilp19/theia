// *****************************************************************************
// Copyright (C) 2026 akhilp19 and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import URI from '@theia/core/lib/common/uri';
import { BuildSystem } from '../common/build-system-model';

export const BuildSystemAdapter = Symbol('BuildSystemAdapter');

export interface BuildSystemAdapter {
    readonly id: string;
    readonly name: string;
    readonly priority: number;
    canHandle(root: URI): Promise<boolean>;
    createBuildSystem(root: URI): Promise<BuildSystem>;
}
