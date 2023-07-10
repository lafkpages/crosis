import * as esbuild from "esbuild";
import nodepkgs from "./package.json" assert { type: "json" };

const dependencies = nodepkgs.dependencies;

const sharedConfig = {
  bundle: true,
  entryPoints: ["./src/index.ts", "./test/index.js"],
  external: Object.keys(dependencies),
  logLevel: "info",
  minify: true,
  sourcemap: true,
};

await esbuild.build({
  ...sharedConfig,
  format: "esm",
  outfile: "./dist/index.esm.js",
  target: ["esnext", "node12.22.0"],
});

await esbuild.build({
  ...sharedConfig,
  format: "cjs",
  outfile: "./dist/index.cjs.js",
  target: ["esnext", "node12.22.0"],
});
