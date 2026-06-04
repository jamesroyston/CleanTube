import "@mui/material/themeCssVarsAugmentation";

declare module "@mui/material/styles" {
  interface Palette {
    overlay: string;
    scrim: string;
  }
  interface PaletteOptions {
    overlay?: string;
    scrim?: string;
  }
}

export {};
