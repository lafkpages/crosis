![crosis banner](https://raw.githubusercontent.com/lafkpages/crosis/main/readme/readme_crosis_banner.png)

![npm](https://img.shields.io/npm/dt/crosis)
![npm](https://img.shields.io/npm/v/crosis)

**crosis** is a NPM package that allows you to programmatically interact with your Replit Repl.
Our goal is to make this process as easy and simple as possible.

# 🔥Features

- 📄 File manipulation
- 📁 Folder manipulation
- 📠 Command execution
- 📲 Easy log in process
- 🚀 Performance

# Installation & Usage

Install the package by running `npm install crosis`.
You can use the package in both CommonJS and ESM.

# Example

```js
// Import the crosis package

// CommonJS
const { Crosis } = require("crosis");

// OR

// ESM
import { Crosis } from "crosis";

// Create a Crosis object
const crosis = new Crosis({
  adapter: adapterReplit({
    replId: YOUR_REPL_ID,
    sid: YOUR_REPLIT_SID,
  }),
  debug: true,
});

// Connect crosis
crosis.connect().then(async () => {
  console.log("Crosis connected");

  // Read files of repl
  const files = await crosis.readDir(".");

  // List files
  files.forEach((file) => {
    console.log(file);
  });

  // Disconnect crosis at the end of the script
  // Terminating or ending the script will also disconnect crosis
  await crosis.disconnect();
});
```

# Contributing

Contributions are always welcome! If you want to contribute, feel free to open a pull request.

# License

The crosis package is licensed under the AGPL-3.0 License. See LICENSE for more information.
