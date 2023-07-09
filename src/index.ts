import { WebSocket } from "ws";
import { api as ReplitProtocol } from "@replit/protocol";

import type { CrosisOptions, Adapter } from "./lib/types";

const defaultOptions: CrosisOptions = {};

export class Crosis {
  private url: string | null;
  private adapter: Adapter | null;
  private ws: WebSocket;
  private refHandlers: Record<string, Function>;

  constructor(options: CrosisOptions) {
    options = {
      ...defaultOptions,
      ...options,
    };

    this.adapter = options.adapter || null;

    this.url = options.url || undefined;
    this.ws = null;

    this.refHandlers = {};
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

      // Run handler for this ref
      if (message.ref && this.refHandlers[message.ref]) {
        this.refHandlers[message.ref](message);
      }
    };
  }

  generateRef() {
    // Return a random string
    return Math.random().toString(36).substring(2);
  }

  send(message: any, autoRef = true): Promise<ReplitProtocol.Command> {
    if (autoRef && !message.ref) {
      message.ref = this.generateRef();
    }

    this.ws.send(
      ReplitProtocol.Command.encode(
        ReplitProtocol.Command.create(message)
      ).finish()
    );

    return new Promise((resolve) => {
      this.refHandlers[message.ref] = resolve;
    });
  }

  async openChannel(service: string, name?: string, action?: ReplitProtocol.OpenChannel.Action) {
    const openChanRes = await this.send({
      channel: 0,
      openChan: {
        service,
        name: name || '',
        action: action || ReplitProtocol.OpenChannel.Action.ATTACH_OR_CREATE
      },
    });

    return openChanRes.openChanRes;
  }
}
