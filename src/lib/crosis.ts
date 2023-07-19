import _protocol from "@replit/protocol";
import protocol = _protocol.api;

import { WebSocket } from "ws";

import type { CrosisOptions, Adapter } from "./types";
import { Channel } from "./channel.js";

import { EventEmitter } from "events";

const defaultOptions: CrosisOptions = {};

declare interface Crosis {
  on(event: 'connect', listener: () => void): this;
  on(event: 'disconnect', listener: () => void): this;
  on(event: 'message', listener: (message: protocol.Command) => void): this;
  on(event: 'openChannel', listener: (channel: Channel) => void): this;
  on(event: 'closeChannel', listener: (closeChanRes: protocol.CloseChannelRes) => void): this;
  on(event: string, listener: Function): this;
}

class Crosis extends EventEmitter {
  private url: string | null;
  private adapter: Adapter | null;
  private ws: WebSocket | null;
  private debug: boolean;
  private refHandlers: Record<string, Function>;
  private channels: Record<number, Channel>;
  private channelsByName: Record<string, number>;
  bootStatus: protocol.BootStatus.Stage | null;
  containerState: protocol.ContainerState.State | null;

  constructor(options: CrosisOptions) {
    super();

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
    this.channelsByName = {};

    this.bootStatus = null;
    this.containerState = null;
  }

  get wsReadyState() {
    return this.ws?.readyState || WebSocket.CLOSED;
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
      if (typeof event.data == "string") {
        return;
      }

      let data: Uint8Array;
      if (event.data instanceof Uint8Array) {
        data = event.data;
      } else if (event.data instanceof ArrayBuffer || event.data instanceof Buffer) {
        data = new Uint8Array(event.data);
      } else {
        return;
      }

      const message = protocol.Command.decode(data);

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

      // Emit events
      this.emit('message', message);
    };

    // Emit events
    this.emit('connect');
  }

  private generateRef() {
    // Return a random string
    return Math.random().toString(36).substring(2);
  }

  send(message: any, autoRef = true): Promise<protocol.Command> {
    if (autoRef && !message.ref) {
      message.ref = this.generateRef();
    }

    this.ws.send(
      protocol.Command.encode(protocol.Command.create(message)).finish()
    );

    return new Promise((resolve) => {
      this.refHandlers[message.ref] = resolve;
    });
  }

  async openChannel(
    service: string,
    name?: string,
    action?: protocol.OpenChannel.Action
  ) {
    const openChanRes = await this.send({
      channel: 0,
      openChan: {
        service,
        name: name || "",
        action: action || protocol.OpenChannel.Action.ATTACH_OR_CREATE,
      },
    });

    const channel = new Channel(this, openChanRes.openChanRes);

    this.channels[openChanRes.openChanRes.id] = channel;

    // Make findable by channel name later on
    if (name) {
      if (name in this.channelsByName) {
        throw new Error(`Channel already exists with name "${name}"`);
      }

      this.channelsByName[name] = openChanRes.openChanRes.id;
    }

    // Emit events
    this.emit('openChannel', channel);

    return channel;
  }

  async closeChannel(id: number, action?: protocol.CloseChannel.Action) {
    const closeChanRes = await this.send({
      channel: 0,
      closeChan: {
        id,
        action: action || protocol.CloseChannel.Action.TRY_CLOSE,
      },
    });

    delete this.channels[id];

    // Emit events
    this.emit('closeChannel', closeChanRes.closeChanRes);

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

    // Emit events
    this.emit('disconnect');
  }

  getChannelIdByName(name: string) {
    return this.channelsByName[name];
  }
}

export { Crosis };
