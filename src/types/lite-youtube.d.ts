import type { CSSProperties } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "lite-youtube": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          videoid?: string;
          title?: string;
          params?: string;
          playlabel?: string;
          /** Present on the element → lite-youtube uses YT.Player + iframe_api (keyboard, etc.). */
          "js-api"?: string | boolean;
          style?: CSSProperties;
        },
        HTMLElement
      >;
    }
  }
}
