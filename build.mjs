import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["./src/index.ts"],
  outdir: "./dist",
});

// Could also be run as:
// esbuild --outdir=./dist ./src/index.ts
