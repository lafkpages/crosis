import { build } from "esbuild";

const sharedConfig = {
  bundle: false,
  entryPoints: [
    "./src/index.ts",
    "./src/lib/crosis.ts",
    "./src/lib/channel.ts",
    "./src/lib/adapters/index.ts",
    "./src/lib/adapters/replit.ts",
  ], // TODO: use glob
  logLevel: "info",
  minify: false,
  sourcemap: true,
};

await build({
  ...sharedConfig,
  format: "esm",
  outdir: "dist",
  target: ["esnext", "node12.22.0"],
  banner: {
    js: "import*as _r_p from'@replit/protocol';const protocol=_r_p.default.api;import{WebSocket}from'ws'/*",

    /* 
      This is a really hacky trick.

      Because @replit/protocol types are broken, the imports
      used in src/lib/crosis.ts and src/lib/channels.ts aren't
      actually valid, but they make the types work. So here,
      we comment out those invalid imports and replace them
      with ones that actually work.
    */
  },
  legalComments: "inline",
});

await build({
  ...sharedConfig,
  format: "cjs",
  outdir: "dist",
  outExtension: { ".js": ".cjs" },
  target: ["esnext", "node12.22.0"],
});
