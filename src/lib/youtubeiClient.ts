import Innertube, { Parser } from "youtubei.js";

let innertubePromise: Promise<Innertube> | null = null;
let parserHandlerInstalled = false;

type ParserErrorContext = {
  error_type?: string;
  classname?: string;
  expected?: string | string[];
  [key: string]: unknown;
};

function installParserErrorHandler(): void {
  if (parserHandlerInstalled) return;
  parserHandlerInstalled = true;

  Parser.setParserErrorHandler((ctx: ParserErrorContext) => {
    // youtubei.js 10.5 currently emits noisy parser warnings for new summary nodes in search payloads.
    // These are non-fatal for our mapped search results.
    if (
      (ctx.classname === "VideoSummaryContentView" ||
        ctx.classname === "VideoSummaryParagraphView") &&
      (ctx.error_type === "typecheck" || ctx.error_type === "class_not_found")
    ) {
      return;
    }
    // Keep visibility for all other parser issues.
    console.warn("[youtubei parser]", ctx);
  });
}

export function getInnertube(): Promise<Innertube> {
  if (!innertubePromise) {
    installParserErrorHandler();
    innertubePromise = Innertube.create();
  }
  return innertubePromise;
}
