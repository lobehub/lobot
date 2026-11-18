import remarkBreaks from 'remark-breaks';
import remarkCjkFriendly from 'remark-cjk-friendly';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';

import { CHANNEL_THREAD_REF_TAG, remarkChannelThreadRefs } from './threadRefMarkdown';

// The plugins the chat Markdown runs ahead of ours (`@lobehub/ui` in its `chat` variant).
const chatProcessor = () =>
  unified()
    .use(remarkParse)
    .use(remarkCjkFriendly)
    .use(remarkGfm, { singleTilde: false })
    .use(remarkBreaks);

const strip = (node: any): any =>
  node.children
    ? { type: node.type, children: node.children.map(strip) }
    : { type: node.type, value: node.value };

const refs = (markdown: string) => {
  const processor = chatProcessor().use(remarkChannelThreadRefs);
  const tree = processor.runSync(processor.parse(markdown)) as any;
  const found: string[] = [];
  const walk = (node: any) => {
    if (node.data?.hName === CHANNEL_THREAD_REF_TAG) found.push(node.data.hProperties.threadId);
    node.children?.forEach(walk);
  };
  walk(tree);
  return found;
};

describe('remarkChannelThreadRefs', () => {
  it('sees `<#cht_…>` as plain text: neither an autolink nor raw HTML', () => {
    const processor = chatProcessor();
    const tree = processor.runSync(processor.parse('接着在这里说 <#cht_abc123>')) as any;
    expect(strip(tree.children[0])).toEqual({
      children: [{ type: 'text', value: '接着在这里说 <#cht_abc123>' }],
      type: 'paragraph',
    });
  });

  it('turns each thread reference into a chip, keeping the text around it', () => {
    const processor = chatProcessor().use(remarkChannelThreadRefs);
    const tree = processor.runSync(
      processor.parse('这个接着在这个 Thread 里说 <#cht_abc123>，以及<#cht_a-B_9>。'),
    ) as any;
    expect(tree.children[0].children.map((node: any) => node.value ?? node.type)).toEqual([
      '这个接着在这个 Thread 里说 ',
      'channelThreadRef',
      '，以及',
      'channelThreadRef',
      '。',
    ]);
    expect(refs('<#cht_abc123> and <#cht_a-B_9>')).toEqual(['cht_abc123', 'cht_a-B_9']);
  });

  it('becomes a `channel-thread-ref` element carrying the thread id', () => {
    const processor = chatProcessor().use(remarkChannelThreadRefs).use(remarkRehype);
    const hast = processor.runSync(processor.parse('see <#cht_abc123>')) as any;
    expect(hast.children[0].children[1]).toMatchObject({
      properties: { threadId: 'cht_abc123' },
      tagName: CHANNEL_THREAD_REF_TAG,
      type: 'element',
    });
  });

  it('works inside emphasis and lists', () => {
    expect(refs('**see <#cht_x1>**\n\n- <#cht_x2>')).toEqual(['cht_x1', 'cht_x2']);
  });

  it('leaves code and other ids untouched', () => {
    expect(refs('`<#cht_x>`\n\n```\n<#cht_y>\n```')).toEqual([]);
    expect(refs('<#chn_abc> <#123> <#cht_> #cht_abc')).toEqual([]);
  });
});
