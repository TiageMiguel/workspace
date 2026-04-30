<p align="center">
  <img src="./.github/assets/icon.png" width="200" height="200" />
</p>

# Workspace

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

Manage and access all your projects and folders from one place.

Workspace is a Raycast extension that gives you a central hub for all your projects across multiple directories.

> [!TIP]
> **Not just for developers!** Perfect for code, design assets, writing, or any folder-based workflows.

## Installation

To install and run this extension locally, please follow the [official Raycast guide for installing extensions from source](https://developers.raycast.com/basics/create-your-first-extension#build-the-extension).

Essentially, you just need to clone the repository, run `npm install`, and then `npm run dev` to register it within Raycast.

## Key Features

- Blazing-fast fzf-style fuzzy search
- Unified list of all projects from your configured workspace folders
- Instant open in your default (or per-workspace) application
- **Grid and List Views**: Toggle between Grid and List views seamlessly.
- **Recent Projects**: Automatically tracks your most recently opened projects.
- **Import/Export Settings**: Backup and restore all your workspaces, pins, and configurations to a single JSON file.
- Git status: current branch + pending changes
- Pin favorite projects
- Add, remove, and reorder workspace folders

## Screenshots

![Main project list with pinned items and Git status](./.github/assets/screenshot-1.png)

> Main Workspace command with pinned projects, Git status, and fast search.

![Manage Workspaces view](./.github/assets/screenshot-2.png)

> Adding, removing, and reordering workspace folders + per-workspace app overrides.

## Getting Started

1. Run **Manage Workspaces** to add your project root folders.
2. Configure your default application and preferred view mode in **Workspace Settings**.
3. Use the **Workspace** command to search and open projects instantly.
4. Export your settings to keep a backup of your workspaces and pinned projects.

## Commands

- **Workspace** – Search and open projects
- **Manage Workspaces** – Add/remove/reorder workspace folders
- **Workspace Settings** – Apps, View Mode, and Backup/Restore settings

## Creator's Note

I keep the `Workspace` command in my Raycast Favorites (`⌘ + 2`).  
Fastest workflow: `⌘ + Space` → `⌘ + 2` → type project name or pick a pinned one.

## Contributing

Contributions welcome! Open an issue or submit a pull request on GitHub.
