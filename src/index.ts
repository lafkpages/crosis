import { WebSocket } from "ws";
import { api as ReplitProtocol } from "@replit/protocol";

import type { CrosisOptions, Adapter } from "./lib/types";

const defaultOptions: CrosisOptions = {};

export class Crosis {
  private url: string | null;
  private adapter: Adapter | null;
  private ws: WebSocket;

  constructor(options: CrosisOptions) {
    options = {
      ...defaultOptions,
      ...options,
    };

    this.adapter = options.adapter || null;

    this.url = options.url || undefined;
    this.ws = null;
  }

  async connect() {
    const adapterResult = this.adapter ? await this.adapter() : null;

    if (adapterResult?.url) {
      this.url = adapterResult.url;
    }

    this.ws = new WebSocket(this.url);

    // Wait for the WebSocket to be ready
    await new Promise((resolve) => {
      this.ws.onopen = resolve;
    });

    // Add event listeners
    this.ws.onmessage = (event) => {
      const message = ReplitProtocol.Command.decode(event.data);
      console.log(message);
    };
  }

  openChannel(options: ReplitProtocol.OpenChannel) {
    const message = ReplitProtocol.Command.encode(
      ReplitProtocol.Command.create({
        channel: 0,
        openChan: options,
      })
    );

    this.ws.send(message);

    // TODO: await for the openChanRes response
  }
}
