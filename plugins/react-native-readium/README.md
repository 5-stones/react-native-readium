# react-native-readium — Claude Code plugin

A Claude Code [Agent Skill](https://code.claude.com/docs/en/skills) that teaches AI coding
agents how to integrate and use [`react-native-readium`](https://github.com/5-stones/react-native-readium)
in a React Native / Expo app — installation, `<ReadiumView>`, locators & preferences,
highlights/decorations, navigation, search, and the format/DRM/media limitations.

The skill is **model-invoked**: agents load it automatically when a task matches its
description. It works in Claude Code and any other tool that supports the open
[Agent Skills](https://agentskills.io) standard (Codex CLI, Gemini CLI, Cursor, Copilot, …).

## Install

### From the marketplace (recommended)

```text
/plugin marketplace add 5-stones/react-native-readium
/plugin install react-native-readium@react-native-readium
```
Update later with `/plugin marketplace update react-native-readium`.

### From the installed npm package (version-locked to the library)

The skill (and a `.claude-plugin/marketplace.json`) ship inside the npm package, so they always
match the installed library version. Register the local copy as a marketplace and install it
(run these in the Claude Code prompt, from your app's project root):

```text
/plugin marketplace add ./node_modules/react-native-readium
/plugin install react-native-readium@react-native-readium
```

Or load it for a single session without installing (run in your shell):

```sh
claude --plugin-dir node_modules/react-native-readium/plugins/react-native-readium
```

### Use the skill directly (any Agent-Skills-compatible tool)

Copy the skill folder into a discovery directory. Claude Code reads `.claude/skills/`; Codex CLI,
Gemini CLI, and OpenCode read the vendor-neutral `.agents/skills/`. Use `~/.claude` / `~/.agents`
for a global (all-projects) install instead of project-scoped.

```sh
SRC=node_modules/react-native-readium/plugins/react-native-readium/skills/react-native-readium

mkdir -p .claude/skills .agents/skills
cp -r "$SRC" .claude/skills/react-native-readium     # Claude Code
cp -r "$SRC" .agents/skills/react-native-readium     # Codex / Gemini CLI / OpenCode
```

This results in `<dir>/react-native-readium/SKILL.md`. Restart the agent (skills load at startup);
it duplicates the files, so re-copy after upgrading the package to stay in sync.

## Contents

```
plugins/react-native-readium/
├── .claude-plugin/plugin.json
└── skills/
    └── react-native-readium/
        ├── SKILL.md                 # main instructions (loaded when triggered)
        └── references/api.md        # full props/ref/interfaces (loaded on demand)
```

Only trust and install skills from sources you trust — skills can instruct an agent to run code.
