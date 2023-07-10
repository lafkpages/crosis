import { build } from "esbuild";
import { transformExtPlugin } from "@gjsify/esbuild-plugin-transform-ext";

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
