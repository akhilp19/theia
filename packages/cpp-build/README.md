# @theia/cpp-build

C/C++ build-system adapter for Theia.

## Purpose

This extension detects and drives C/C++ build systems from within Theia. It is the foundation for compiler-driven indexing, cross-platform builds, and C/C++-specific debugging in the CPPStudio IDE.

## Supported build systems

| System | Detection | Configure | Build | Compile commands |
|--------|-----------|-----------|-------|------------------|
| CMake  | `CMakeLists.txt` | Planned | Planned | `build/compile_commands.json` |
| Bazel  | `WORKSPACE`, `MODULE.bazel` | - | Planned | `compile_commands.json` |
| Meson  | `meson.build` | Planned | Planned | `builddir/compile_commands.json` |
| Make   | `Makefile` | - | Planned | `compile_commands.json` |

## Architecture

- `common/` — RPC protocol, preference schema, and build-system models.
- `browser/` — frontend commands, status bar, workspace detection, and service proxy.
- `node/` — backend server, build-system registry, and per-system adapters.

## Commands

- `C/C++: Detect Build System`
- `C/C++: Configure Project`
- `C/C++: Build Project`
- `C/C++: Show Compile Commands Path`

## Status

This is a scaffold. The CMake adapter is the first target for full implementation.
