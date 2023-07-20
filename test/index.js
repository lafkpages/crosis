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
  console.log("Crosis connected!");

  console.log("Files:", await crosis.readDir("."));

  console.log(
    "Contents of test.txt:",
    (await crosis.readFile("test.txt")).toString()
  );

  crosis.disconnect();
});
