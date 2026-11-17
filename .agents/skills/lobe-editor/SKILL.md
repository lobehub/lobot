---
name: lobe-editor
description: "A Lexical editor for React, with markdown, plugins, and a chat composer. Use when choosing a component, looking up its props and API, or implementing UI with it."
---

# Lobe Editor

> A Lexical editor for React, with markdown, plugins, and a chat composer.

## Setup

- Package: `@lobehub/editor`
- Repository: https://github.com/lobehub/lobe-editor
- Docs: https://editor.lobehub.com/

## Workflow

1. Pick candidates from the index below. Groups follow the source folder, which usually maps to the import entry.
2. Fetch the linked reference page before writing code. It holds the documented usage, props and API tables.
3. Only use props, variants and imports that the reference page documents. Follow its Docs link to see live demos.

The page index with outlines is at https://editor.lobehub.com/llms.txt.

## Index

### Guides

- [Components](https://editor.lobehub.com/skills/components.md) — Entry page for React components, renderer components, and plugin docs.

### react

#### Data Entry

- [ChatInput](https://editor.lobehub.com/skills/components/react/chat-input.md) — ChatInput is a flexible container component for building chat input interfaces.
- [CodeLanguageSelect](https://editor.lobehub.com/skills/components/react/code-language-select.md) — CodeLanguageSelect is a specialized select component for choosing programming languages.

#### General

- [ChatInputActions](https://editor.lobehub.com/skills/components/react/chat-input-actions.md) — ChatInputActions is a sophisticated action management component for chat interfaces.
- [FloatActions](https://editor.lobehub.com/skills/components/react/float-actions.md) — FloatActions is a sophisticated action management component for chat interfaces.
- [SendButton](https://editor.lobehub.com/skills/components/react/send-button.md) — SendButton provides send and stop controls for chat input workflows.

#### Layout

- [ChatInputActionBar](https://editor.lobehub.com/skills/components/react/chat-input-action-bar.md) — ChatInputActionBar is a horizontal layout component for organizing actions in chat input interfaces.

#### Playground

- [Editor](https://editor.lobehub.com/skills/components/react/editor.md) — Editor is a comprehensive rich text editor component built on a powerful editor kernel.

#### Providers

- [EditorProvider](https://editor.lobehub.com/skills/components/react/editor-provider.md) — Global editor configuration provider that supports unified management of locale, themes, and other global settings.

### plugins

#### Core

- [Common](https://editor.lobehub.com/skills/components/plugins/common.md) — Common plugin provides the foundational editor components and utilities.
- [Markdown](https://editor.lobehub.com/skills/components/plugins/markdown.md) — Markdown plugin provides comprehensive markdown transformation and serialization capabilities.

#### Plugins

- [Alert](https://editor.lobehub.com/skills/components/plugins/alert.md) — Alert plugin adds GitHub-style callout blocks (note, tip, important, warning, caution) that hold regular blocks and round-trip through Mark…
- [Chart](https://editor.lobehub.com/skills/components/plugins/chart.md) — Chart plugin adds a block that stores a bar, line, area or pie chart as a JSON spec, round-trips it through LiteXML and Markdown, and rende…
- [Code](https://editor.lobehub.com/skills/components/plugins/code.md) — Code plugin enables inline code formatting in the editor.
- [Codeblock](https://editor.lobehub.com/skills/components/plugins/codeblock.md) — Codeblock plugin adds code blocks with syntax highlighting by @pierre/highlights, light and dark themes, language switching and markdown sh…
- [Collapsible](https://editor.lobehub.com/skills/components/plugins/collapsible.md) — Collapsible blocks keep a visible title, editable nested content, and collaboration-safe collapse and keyboard behavior.
- [Content Blocks](https://editor.lobehub.com/skills/components/plugins/content-blocks.md) — Content Blocks plugin extracts the current editor state into discrete content blocks (text / image / file) suitable for downstream AI chat…
- [File](https://editor.lobehub.com/skills/components/plugins/file.md) — File plugin provides comprehensive file attachment capabilities with internationalization support.
- [Footnote](https://editor.lobehub.com/skills/components/plugins/footnote.md) — Footnote plugin adds inline footnote references and a footnote section with rich definitions, numbered by first reference, with hover previ…
- [Horizontal Rule](https://editor.lobehub.com/skills/components/plugins/hr.md) — Horizontal Rule (HR) plugin inserts divider nodes, with a Markdown shortcut, Markdown and LiteXML round-trip, and a React plugin that rende…
- [Image](https://editor.lobehub.com/skills/components/plugins/image.md) — Image plugin provides comprehensive image handling capabilities with internationalization support.
- [Link](https://editor.lobehub.com/skills/components/plugins/link.md) — Link plugin provides comprehensive hyperlink functionality with internationalization support.
- [LinkHighlight](https://editor.lobehub.com/skills/components/plugins/link-highlight.md) — Link Highlight plugin enables inline link highlighting in the editor.
- [List](https://editor.lobehub.com/skills/components/plugins/list.md) — List plugin provides comprehensive list functionality for ordered and unordered lists.
- [Math](https://editor.lobehub.com/skills/components/plugins/math.md) — Math plugin enables LaTeX-style mathematical expressions in the editor.
- [Mention](https://editor.lobehub.com/skills/components/plugins/mention.md) — Mention plugin enables @-style mentions in the editor.
- [Slash](https://editor.lobehub.com/skills/components/plugins/slash.md) — Slash plugin enables powerful slash commands (/command) in the editor.
- [Table](https://editor.lobehub.com/skills/components/plugins/table.md) — Table plugin provides comprehensive table editing capabilities with internationalization support.
- [Upload](https://editor.lobehub.com/skills/components/plugins/upload.md) — Upload plugin provides comprehensive file upload handling with drag-and-drop support, priority-based handler system, and service-oriented a…
- [Video](https://editor.lobehub.com/skills/components/plugins/video.md) — Video plugin adds a block video node played with the lobe-ui Video player, with upload or link embedding, a shared Auto / % / px width cont…

### renderer

- [LexicalDiff](https://editor.lobehub.com/skills/components/renderer/lexical-diff.md) — Read-only side-by-side diff viewer for SerializedEditorState values.
- [LexicalRenderer](https://editor.lobehub.com/skills/components/renderer/lexical-renderer.md) — Headless renderer that converts SerializedEditorState JSON to React elements without loading a full editor instance.

