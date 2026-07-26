# @theia/cpp-build

C/C++ build-system adapter for Theia.

## Purpose

This extension detects and drives C/C++ build systems from within Theia. It is the foundation for compiler-driven indexing, cross-platform builds, and C/C++-specific debugging in the CPPStudio IDE.

## Supported build systems

| System | Detection | Presets/Variants | Configure | Build | Compile commands | Targets |
|--------|-----------|------------------|-----------|-------|------------------|---------|
| CMake  | `CMakeLists.txt` | `CMakePresets.json`, standard variants | ✅ | ✅ | `build/compile_commands.json` | From compile_commands.json |
| Bazel  | `WORKSPACE`, `MODULE.bazel` | Target selection | ✅ | ✅ | `compile_commands.json` | - |
| Meson  | `meson.build` | `debug`/`release` | ✅ | ✅ | `builddir/compile_commands.json` | - |
| Make   | `Makefile` | Target selection | - | ✅ | `compile_commands.json` | - |

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
- `C/C++: Generate .clangd Config`
- `C/C++: Debug Selected Target`

## Default keybindings

| Command | Keybinding |
|---------|------------|
| `C/C++: Build Project` | `Ctrl/Cmd + Shift + B` |
| `C/C++: Clean Project` | `Ctrl/Cmd + Shift + Alt + B` |
| `C/C++: Configure Project` | `Ctrl/Cmd + Shift + F9` |

Keybindings can be customized in Theia's keyboard shortcuts editor or `keybindings.json`.

## Status

- Phase A (scaffold) complete.
- Phase B (detection service) complete: CMake preset/variant detection and compile_commands.json resolution implemented.
- Phase C (build execution & output) complete: configure/build/clean invoke real processes and stream output to a **C/C++ Build** output channel.
- Phase D (clangd wiring) complete: `.clangd` config is auto-generated after configure/build with the resolved `CompilationDatabase` path.
- Phase E (debug integration) complete: `cppdbg` debug adapter contribution and `Debug Selected Target` command launch gdb/lldb from a build target.
- Phase F (remote builds) complete: build commands, file detection, `CMakePresets.json`/`compile_commands.json` reading, and `.clangd` writing are routed through Theia's remote abstractions so the extension works with WSL, containers, and SSH hosts.

## Remote builds

When a workspace is opened through Theia's remote connection (e.g. SSH or dev-container), the extension:

1. Extracts the remote connection identifier from the workspace URI.
2. Routes `configure`/`build`/`clean` commands to the remote host via `RemoteConnection.exec()`.
3. Reads `CMakePresets.json`, `CMakeUserPresets.json`, and generated `compile_commands.json` from the remote filesystem.
4. Writes `.clangd` back to the remote workspace root so `clangd` indexes the remote build output.

Local workspaces continue to use Node.js `fs` and `child_process`, so the same code path works for desktop and remote scenarios.
