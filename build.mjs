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
    js: "import*as _r_p from'@replit/protocol';const protocol=_r_p.default;import{WebSocket}from'ws'/*",
  },
  legalComments: "inline",
});

await build({
  ...sharedConfig,
  format: "cjs",
  outfile: "./dist/index.cjs.js",
  target: ["esnext", "node12.22.0"],
});
