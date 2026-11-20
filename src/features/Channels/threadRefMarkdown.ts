import type { Plugin } from 'unified';
import { SKIP, visit } from 'unist-util-visit';

/** Element name the Markdown renderer maps to the Channel thread reference chip. */
export const CHANNEL_THREAD_REF_TAG = 'channel-thread-ref';

/** `<#cht_…>`, the way Discord writes `<#channelId>`: a link to a thread of this Channel. */
const THREAD_REF_PATTERN = /<#(cht_[\w-]+)>/g;

/** Plain text split around its `<#cht_…>` references, for one-line previews that skip Markdown. */
export const splitThreadRefs = (text: string): ({ threadId: string } | string)[] => {
  const parts: ({ threadId: string } | string)[] = [];
  let last = 0;
  for (const match of text.matchAll(THREAD_REF_PATTERN)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push({ threadId: match[1] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
};

/**
 * Turns `<#cht_…>` thread references into chips. CommonMark reads `<#…>` as plain text (it is
 * neither an autolink nor an HTML tag), so only text nodes carry it; code stays literal.
 */
export const remarkChannelThreadRefs: Plugin<[], any> = () => (tree: any) => {
  visit(tree, 'text', (node: any, index, parent: any) => {
    if (!parent || index === undefined) return;
    const value: string = node.value;
    const children: any[] = [];
    let last = 0;
    for (const match of value.matchAll(THREAD_REF_PATTERN)) {
      if (match.index > last)
        children.push({ type: 'text', value: value.slice(last, match.index) });
      children.push({
        children: [],
        data: { hName: CHANNEL_THREAD_REF_TAG, hProperties: { threadId: match[1] } },
        type: 'channelThreadRef',
      });
      last = match.index + match[0].length;
    }
    if (!children.length) return;
    if (last < value.length) children.push({ type: 'text', value: value.slice(last) });
    parent.children.splice(index, 1, ...children);
    return [SKIP, index + children.length];
  });
};
