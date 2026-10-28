import { describe, expect, test } from "bun:test";
import { renderMermaidSVG } from "beautiful-mermaid";
import mermaid from "mermaid";
import { renderMermaidWithFallback } from "./mermaid-renderer";

const GANTT_SOURCE = `gantt
  dateFormat YYYY-MM-DD
  section Web
  Compatibility fallback :fallback, 2026-07-30, 1d`;

describe("Mermaid renderer fallback", () => {
  test("routes the reported subgraph to Mermaid even when the compact renderer would succeed", async () => {
    const source = `flowchart LR
      subgraph 日志开启建议
        A[生产环境] -->|不开启| B[查询日志]
        C[开发/测试/调试] -->|按需开启| B
        E[审计场景] -->|按需开启| B
      end`;
    expect(renderMermaidSVG(source)).toContain("<svg");
    let compactRenderCount = 0;
    const svg = await renderMermaidWithFallback({
      source,
      renderBeautiful: () => {
        compactRenderCount += 1;
        return renderMermaidSVG(source);
      },
      renderOfficial: () => '<svg data-renderer="mermaid"></svg>',
    });
    expect(compactRenderCount).toBe(0);
    expect(svg).toContain('data-renderer="mermaid"');
  });

  test("does not route a comment mentioning subgraphs to the official renderer", async () => {
    const svg = await renderMermaidWithFallback({
      source: "flowchart LR\n%% subgraph example\nA --> B",
      renderBeautiful: () => '<svg data-renderer="beautiful"></svg>',
      renderOfficial: () => { throw new Error("Unexpected official render"); },
    });
    expect(svg).toContain('data-renderer="beautiful"');
  });

  test("always uses the compact renderer when it supports the diagram", async () => {
    let officialRenderCount = 0;
    const svg = await renderMermaidWithFallback({
      renderBeautiful: () => '<svg data-renderer="beautiful"></svg>',
      renderOfficial: () => {
        officialRenderCount += 1;
        return '<svg data-renderer="mermaid"></svg>';
      },
    });

    expect(officialRenderCount).toBe(0);
    expect(svg).toContain('data-renderer="beautiful"');
  });

  test("uses the official renderer for a valid Gantt diagram unsupported by beautiful-mermaid", async () => {
    expect(await mermaid.parse(GANTT_SOURCE, { suppressErrors: true })).toBeTruthy();

    let officialRenderCount = 0;
    const svg = await renderMermaidWithFallback({
      renderBeautiful: () => renderMermaidSVG(GANTT_SOURCE),
      renderOfficial: () => {
        officialRenderCount += 1;
        return '<svg data-renderer="mermaid"></svg>';
      },
    });

    expect(officialRenderCount).toBe(1);
    expect(svg).toContain('data-renderer="mermaid"');
  });
});
