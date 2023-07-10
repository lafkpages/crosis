import { build } from "esbuild";
import nodepkgs from "./package.json" assert { type: "json" };

const dependencies = nodepkgs.dependencies;

const entryFile = "./src/index.ts";
const sharedConfig = {
  bundle: true,
  entryPoints: [entryFile],
  external: Object.keys(dependencies),
  logLevel: "info",
  minify: false,
  sourcemap: true,
};

await build({
  ...sharedConfig,
  format: "esm",
  outfile: "./dist/index.esm.js",
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
  outfile: "./dist/index.cjs.js",
  target: ["esnext", "node12.22.0"],
});
