import { Crosis, adapterReplit } from "../dist/index.js";

// Load dutenv
import { config as dotenv } from "dotenv";
dotenv();

// This is a basic test🗿
const crosis = new Crosis({
  adapter: adapterReplit({
    replId: process.env.REPL_ID,
    sid: process.env.REPLIT_SID,
  }),
  debug: true,
});

crosis.connect().then(async () => {
  console.log("\x1b[32;1m[TEST] Crosis connected!\x1b[0m");

  const files = await crosis.readDir(".");

  console.log("\x1b[32;1m[TEST] Files:\x1b[0m");
  console.log(
    "\x1b[32;1m" +
      files.map((f) => `[TEST] ${f.type ? "📂" : "📝"} ${f.path}`).join("\n") +
      "\x1b[0m"
  );

  console.log(
    "\x1b[32;1m[TEST] Contents of test.txt:",
    (await crosis.readFile("test.txt")).toString() + "\x1b[0m"
  );

  console.log(
    "\x1b[32;1m[TEST] Testing exec:",
    (await crosis.exec(["echo", "yay hello from echo"])) + "\x1b[0m"
  );

  crosis.disconnect();
});
