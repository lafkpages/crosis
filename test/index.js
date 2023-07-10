import { Crosis, adapterReplit } from "../dist/index";

// Load dutenv
import { config as dotenv } from "dotenv";
dotenv();

// This is a basic test
const crosis = new Crosis({
  adapter: adapterReplit({
    replId: process.env.REPL_ID,
    sid: process.env.REPLIT_SID,
  }),
  debug: true,
});

crosis.connect().then(async () => {
  console.log("Crosis connected!");

  const gcsFilesChannel = await crosis.openChannel("gcsfiles");
  console.log("Opened GCSFiles channel!");

  const fileRes = await gcsFilesChannel.send({
    read: {
      path: "test.txt",
    },
  });

  console.log("Contents of test.txt:", fileRes.file.content.toString());

  crosis.disconnect();
});
