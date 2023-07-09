import { WebSocket } from "ws";
import { api as ReplitProtocol } from "@replit/protocol";

import type { CrosisOptions, Adapter } from "./lib/types";

const defaultOptions: CrosisOptions = {};

export class Crosis {
  private url: string | null;
  private adapter: Adapter | null;
  private ws: WebSocket;
  private debug: boolean;
  private refHandlers: Record<string, Function>;
  private channels: Record<number, Channel>;

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

      if (this.debug) {
        console.log(message);
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

    const channel = new Channel(this, openChanRes.openChanRes);

    this.channels[openChanRes.openChanRes.id] = channel;

    return channel;
  }

  async closeChannel(id: number, action?: ReplitProtocol.CloseChannel.Action) {
    const closeChanRes = await this.send({
      channel: 0,
      closeChan: {
        id,
        action: action || ReplitProtocol.CloseChannel.Action.TRY_CLOSE
      }
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

export class Channel {
  private crosis: Crosis;
  private openChanRes: ReplitProtocol.OpenChannelRes;

  constructor(crosis: Crosis, openChanRes: ReplitProtocol.OpenChannelRes) {
    this.crosis = crosis;
    this.openChanRes = openChanRes;
  }

  get id() {
    return this.openChanRes.id;
  }

  send(...args: Parameters<Crosis["send"]>) {
    args[0].channel = this.id;

    return this.crosis.send(...args);
  }

  close(action?: ReplitProtocol.CloseChannel.Action) {
    return this.crosis.closeChannel(this.id, action);
  }
}
