import { build } from "esbuild";
import { transformExtPlugin } from "@gjsify/esbuild-plugin-transform-ext";
import glob from "fast-glob";

const entryPoints = await glob(["./src/**/*.ts", "!./src/lib/types"]);

const sharedConfig = {
  bundle: false,
  entryPoints,
  logLevel: "info",
  minify: true,
  sourcemap: true,
  outdir: "dist",
  target: ["esnext", "node12.22.0"],
};

await build({
  ...sharedConfig,
  format: "esm",
});

await build({
  ...sharedConfig,
  format: "cjs",
  outExtension: { ".js": ".cjs" },
  plugins: [
    transformExtPlugin({
      outExtension: { ".js": ".cjs" },
    }),
  ],
});
