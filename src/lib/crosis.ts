import * as protocol from "@replit/protocol";

import { WebSocket } from "ws";

import type { CrosisOptions, Adapter } from "$lib/types";
import { Channel } from "./channel.js";

const defaultOptions: CrosisOptions = {};

class Crosis {
  private url: string | null;
  private adapter: Adapter | null;
  private ws: WebSocket;
  private debug: boolean;
  private refHandlers: Record<string, Function>;
  private channels: Record<number, Channel>;
  bootStatus: protocol.api.BootStatus.Stage | null;
  containerState: protocol.api.ContainerState.State | null;

  constructor(options: CrosisOptions) {
    options = {
      ...defaultOptions,
      ...options,
    };

    this.adapter = options.adapter || null;

    this.url = options.url || undefined;
    this.ws = null;

    this.debug = options.debug || false;

    this.refHandlers = {};

    this.channels = {};

    this.bootStatus = null;
    this.containerState = null;
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
      const message = protocol.api.Command.decode(event.data);

      if (this.debug) {
        console.log(message);
      }

      // Save boot status
      if (typeof message.bootStatus?.stage == "number") {
        this.bootStatus = message.bootStatus.stage;
      }

      // Save container state
      if (typeof message.containerState?.state == "number") {
        this.containerState = message.containerState.state;
      }

      // Run handler for this ref
      if (message.ref && this.refHandlers[message.ref]) {
        this.refHandlers[message.ref](message);
      }
    };
  }

  private generateRef() {
    // Return a random string
    return Math.random().toString(36).substring(2);
  }

  send(message: any, autoRef = true): Promise<protocol.api.Command> {
    if (autoRef && !message.ref) {
      message.ref = this.generateRef();
    }

    this.ws.send(
      protocol.api.Command.encode(protocol.api.Command.create(message)).finish()
    );

    return new Promise((resolve) => {
      this.refHandlers[message.ref] = resolve;
    });
  }

  async openChannel(
    service: string,
    name?: string,
    action?: protocol.api.OpenChannel.Action
  ) {
    const openChanRes = await this.send({
      channel: 0,
      openChan: {
        service,
        name: name || "",
        action: action || protocol.api.OpenChannel.Action.ATTACH_OR_CREATE,
      },
    });

    const channel = new Channel(this, openChanRes.openChanRes);

    this.channels[openChanRes.openChanRes.id] = channel;

    return channel;
  }

  async closeChannel(id: number, action?: protocol.api.CloseChannel.Action) {
    const closeChanRes = await this.send({
      channel: 0,
      closeChan: {
        id,
        action: action || protocol.api.CloseChannel.Action.TRY_CLOSE,
      },
    });

    delete this.channels[id];

    return closeChanRes.closeChanRes;
  }

  async disconnect(autoClose = true) {
    // Close all channels
    if (autoClose) {
      for (const channel of Object.values(this.channels)) {
        await channel.close();
      }
    }

    this.ws.close();
  }
}

export { Crosis };