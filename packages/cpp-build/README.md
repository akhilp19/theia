# @theia/cpp-build

C/C++ build-system adapter for Theia.

## Purpose

This extension detects and drives C/C++ build systems from within Theia. It is the foundation for compiler-driven indexing, cross-platform builds, and C/C++-specific debugging in the CPPStudio IDE.

## Supported build systems

| System | Detection | Presets/Variants | Configure | Build | Compile commands | Targets |
|--------|-----------|------------------|-----------|-------|------------------|---------|
| CMake  | `CMakeLists.txt` | `CMakePresets.json`, standard variants | In progress | In progress | `build/compile_commands.json` | From compile_commands.json |
| Bazel  | `WORKSPACE`, `MODULE.bazel` | Target selection | Planned | Planned | `compile_commands.json` | Planned |
| Meson  | `meson.build` | `debug`/`release` | Planned | Planned | `builddir/compile_commands.json` | Planned |
| Make   | `Makefile` | Target selection | - | Planned | `compile_commands.json` | Planned |

## Architecture

- `common/` — RPC protocol, preference schema, and build-system models.
- `browser/` — frontend commands, quick-pick preset selection, status bar, workspace detection, and service proxy.
- `node/` — backend server, build-system registry, per-system adapters, and process utilities.

## Commands

- `C/C++: Detect Build System`
- `C/C++: Select Build Preset`
- `C/C++: Configure Project`
- `C/C++: Build Project`
- `C/C++: Clean Project`
- `C/C++: Show Compile Commands Path`
- `C/C++: Show Build Targets`

## Default keybindings

| Command | Keybinding |
|---------|------------|
| `C/C++: Build Project` | `Ctrl/Cmd + Shift + B` |
| `C/C++: Clean Project` | `Ctrl/Cmd + Shift + Alt + B` |
| `C/C++: Configure Project` | `Ctrl/Cmd + Shift + F9` |

Keybindings can be customized in Theia's keyboard shortcuts editor or `keybindings.json`.

## Status

- Phase A (scaffold) complete.
- Phase B (detection service) in progress: CMake preset/variant detection and compile_commands.json resolution implemented.
