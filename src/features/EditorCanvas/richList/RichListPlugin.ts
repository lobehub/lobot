import { type getKernelFromEditor, useLexicalComposerContext } from '@lobehub/editor';
import { type FC, useLayoutEffect } from 'react';

type IEditorKernel = NonNullable<ReturnType<typeof getKernelFromEditor>>;

/** Marks list items rendered as headings, for the editor's stylesheet. */
export const LIST_HEADING_ATTRIBUTE = 'data-list-heading';

/**
 * The page editor's side of rich lists: typing, commands and rendering. What
 * the document itself needs (Markdown, numbering) is shared with the server's
 * headless editor through `registerRichListDocument`.
 */
export class RichListPlugin {
  static pluginName = 'LobeRichListPlugin';
  private kernel: IEditorKernel;

  constructor(kernel: IEditorKernel) {
    this.kernel = kernel;
  }
}

export const ReactRichListPlugin: FC = () => {
  const [editor] = useLexicalComposerContext();

  useLayoutEffect(() => {
    editor.registerPlugin(RichListPlugin as never);
  }, [editor]);

  return null;
};

ReactRichListPlugin.displayName = 'ReactRichListPlugin';
