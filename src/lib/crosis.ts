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
  private refHandlers: Record<string, (message: protocol.Command) => void>;
  private channels: Record<number, Channel>;
  private channelsByName: Record<string, number>;
  private utilFuncsChannels: Record<string, number>;
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

    this.utilFuncsChannels = {};

    this.bootStatus = null;
    this.containerState = null;
  }

  /**
   * Sets the adapter to use.
   * 
   * Usually you'll want to specify the adapter
   * when instantiating Crosis, but you can also
   * set it later on.
   */
  setAdapter(adapter: Adapter) {
    // Don't allow changing adapter while connected
    if (this.wsReadyState != WebSocket.CLOSED) {
      throw new Error("Cannot change adapter while connected");
    }

    this.adapter = adapter;
  }

  /**
   * Returns the WebSocket ready state.
   */
  get wsReadyState() {
    // TODO: if it's 0, the or will trigger

    return this.ws?.readyState || WebSocket.CLOSED;
  }

  /**
   * Connects to the WebSocket server, waits for
   * the WebSocket to be ready, and sets up all
   * required event listeners.
   * 
   * When a connection is successful, the "connect"
   * event is emitted, which can be listened to
   * with `crosis.on("connect", () => { ... })`.
   */
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

  /**
   * Generates a random message ref.
   */
  private generateRef() {
    // Return a random string
    return Math.random().toString(36).substring(2);
  }

  /**
   * Encodes the message, sends it, and returns a promise
   * that resolves to the response message.
   * 
   * The response message is determined by the ref field.
   * It will have the same ref as the original sent message.
   * 
   * If the message does not have a ref, one will be generated,
   * unless autoRef is set to false.
   */
  send(message: any, autoRef = true, throwErrors = true): Promise<protocol.Command> {
    if (autoRef && !message.ref) {
      message.ref = this.generateRef();
    }

    this.ws.send(
      protocol.Command.encode(protocol.Command.create(message)).finish()
    );

    return new Promise((resolve, reject) => {
      this.refHandlers[message.ref] = (message) => {
        if (throwErrors && message.error) {
          reject(message.error);
        }

        resolve(message);
      };
    });
  }

  /**
   * Requests opening a channel for a specified service,
   * with an optional unique channel name.
   *
   * Returns a promise that resolves to a Channel object
   * if the channel was successfully opened. Otherwise,
   * an error is thrown.
   */
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

  /**
   * Requests closing a channel with the specified ID.
   * 
   * Returns a promise that resolves to a CloseChannelRes
   * object, no matter the outcome.
   */
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

  /**
   * Disconnects the WebSocket, and closes all
   * previously opened channels.
   */
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

  /**
   * Returns the ID of the channel with the
   * specified name.
   */
  getChannelIdByName(name: string) {
    return this.channelsByName[name];
  }

  private async startUtil(service: string) {
    if (service in this.utilFuncsChannels) {
      return this.channels[this.utilFuncsChannels[service]];
    } else {
      const channel = await this.openChannel(service);
      this.utilFuncsChannels[service] = channel.id;
      return channel;
    }
  }

  /**
   * Reads a file using GCSFiles.
   */
  async readFile(path: string) {
    const chan = await this.startUtil("gcsfiles");

    const resp = await chan.send({
      read: {
        path
      }
    });

    return resp.file?.content;
  }

  /**
   * Writes a file using GCSFiles.
   */
  async writeFile(path: string, data: string | Buffer | Uint8Array) {
    const chan = await this.startUtil("gcsfiles");

    return await chan.send({
      write: {
        path,
        content: data
      }
    });
  }

  /**
   * Lists files in a directory using GCSFiles.
   */
  async readDir(path: string) {
    const chan = await this.startUtil("gcsfiles");

    const resp = await chan.send({
      readdir: {
        path
      }
    });

    return resp.files.files;
  }
}

export { Crosis };
