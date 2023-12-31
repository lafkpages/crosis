import _protocol from "@replit/protocol";
import protocol = _protocol.api;

import { WebSocket } from "ws";

import type { CrosisOptions, Adapter } from "./types";
import { Channel } from "./channel.js";

import { EventEmitter } from "events";

import { normalize as normalizePath } from "path";

const defaultOptions: CrosisOptions = {};

declare interface Crosis {
  on(event: "connect", listener: () => void): this;
  on(event: "disconnect", listener: () => void): this;
  on(event: "message", listener: (message: protocol.Command) => void): this;
  on(event: "messageSent", listener: (message: protocol.Command) => void): this;
  on(event: "openChannel", listener: (channel: Channel) => void): this;
  on(
    event: "closeChannel",
    listener: (closeChanRes: protocol.CloseChannelRes) => void
  ): this;
  on(event: "toast", listener: (message: string) => void): this;
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
  private otStatuses: Record<string, protocol.OTStatus>;
  private execUtilResolve: ((output: string) => void) | null;
  private execUtilReject: ((error: string | Error) => void) | null;
  private execUtilOutput: string | null;
  bootStatus: protocol.BootStatus.Stage | null;
  containerState: protocol.ContainerState.State | null;

  constructor(options: CrosisOptions) {
    if (!options.url && !options.adapter) {
      throw new Error("Either url or adapter must be specified");
    }

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

    this.otStatuses = {};

    this.bootStatus = null;
    this.containerState = null;

    this.execUtilResolve = null;
    this.execUtilReject = null;
    this.execUtilOutput = null;
  }

  /**
   * Sets the adapter to use.
   *
   * Usually you'll want to specify the adapter
   * when instantiating Crosis, but you can also
   * set it later on.
   */
  setAdapter(adapter: Adapter | null) {
    // Don't allow changing adapter while connected
    if (this.wsReadyState != WebSocket.CLOSED) {
      throw new Error("Cannot change adapter while connected");
    }

    this.adapter = adapter;
  }

  /**
   * Sets the Goval URL to use when connecting.
   * Note that this will be overridden if an
   * adapter is specified.
   */
  setUrl(url: string | null) {
    // Don't allow changing URL while connected
    if (this.wsReadyState != WebSocket.CLOSED) {
      throw new Error("Cannot change URL while connected");
    }

    this.url = url;
  }

  /**
   * Returns the WebSocket ready state.
   */
  get wsReadyState() {
    return this.ws?.readyState ?? WebSocket.CLOSED;
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
      } else if (
        event.data instanceof ArrayBuffer ||
        event.data instanceof Buffer
      ) {
        data = new Uint8Array(event.data);
      } else {
        return;
      }

      const message = protocol.Command.decode(data);
      const channel = this.channels[message.channel];

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

      // Exec util
      if (message.channel == this.utilFuncsChannels.exec) {
        if (message.output) {
          this.execUtilOutput += message.output;
        } else if (message.ok) {
          this.execUtilResolve(this.execUtilOutput);
          this.execUtilResolve = null;
          this.execUtilReject = null;
          this.execUtilOutput = null;
        }
      }

      // OT utils
      if (channel?.service == "ot") {
        if (message.otstatus) {
          this.otStatuses[message.otstatus.linkedFile.path] = message.otstatus;
        }
      }

      // Run handler for this ref
      if (message.ref && this.refHandlers[message.ref]) {
        this.refHandlers[message.ref](message);
      }

      // Emit events
      this.emit("message", message);

      if (message.toast) {
        this.emit("toast", message.toast.text);
      }
    };

    // Emit events
    this.emit("connect");
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
  send(
    message: any,
    autoRef = true,
    throwErrors = true
  ): Promise<protocol.Command> {
    if (autoRef && !message.ref) {
      message.ref = this.generateRef();
    }

    this.ws.send(
      protocol.Command.encode(protocol.Command.create(message)).finish()
    );

    // Emit events
    this.emit("messageSent", message);

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

    const channel = new Channel(this, openChanRes.openChanRes, service, name);

    this.channels[openChanRes.openChanRes.id] = channel;

    // Make findable by channel name later on
    if (name) {
      if (name in this.channelsByName) {
        throw new Error(`Channel already exists with name "${name}"`);
      }

      this.channelsByName[name] = openChanRes.openChanRes.id;
    }

    // Emit events
    this.emit("openChannel", channel);

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
    this.emit("closeChannel", closeChanRes.closeChanRes);

    return closeChanRes.closeChanRes;
  }

  /**
   * Disconnects the WebSocket, and closes all
   * previously opened channels.
   *
   * If we're already disconnected, this will return
   * `false` and do nothing.
   *
   * @param autoClose Whether to automatically close
   * all the channels that were opened
   *
   * @returns Whether the WebSocket was disconnected
   */
  async disconnect(autoClose = true) {
    // If already disconnected, do nothing
    if (this.wsReadyState == WebSocket.CLOSED) {
      return false;
    }

    // Close all channels
    if (autoClose) {
      for (const channel of Object.values(this.channels)) {
        await channel.close();
      }
    }

    this.ws.close();

    // Reset exec util
    this.execUtilReject?.("Disconnected");
    this.execUtilResolve = null;
    this.execUtilReject = null;
    this.execUtilOutput = null;

    // Emit events
    this.emit("disconnect");

    return true;
  }

  /**
   * Returns the ID of the channel with the
   * specified name.
   */
  getChannelIdByName(name: string) {
    return this.channelsByName[name];
  }

  /**
   * Requests opening a channel for util functions to use.
   * If a channel for the specified service already exists,
   * it will be returned instead.
   */
  private async startUtil(...args: Parameters<Crosis["openChannel"]>) {
    const service = args[0];

    if (service in this.utilFuncsChannels) {
      return this.channels[this.utilFuncsChannels[service]];
    } else {
      const channel = await this.openChannel(...args);
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
        path,
      },
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
        content: data,
      },
    });
  }

  /**
   * Stat a file using GCSFiles.
   */
  async statFile(path: string) {
    const chan = await this.startUtil("gcsfiles");

    const resp = await chan.send({
      stat: {
        path,
      },
    });

    return resp.statRes;
  }

  /**
   * Lists files in a directory using GCSFiles.
   */
  async readDir(path: string) {
    const chan = await this.startUtil("gcsfiles");

    const resp = await chan.send({
      readdir: {
        path,
      },
    });

    return resp.files.files;
  }

  /**
   * Creates a directory using GCSFiles.
   */
  async createDir(path: string) {
    const chan = await this.startUtil("gcsfiles");

    return await chan.send({
      mkdir: {
        path,
      },
    });
  }

  /**
   * Executes a shell command.
   *
   * Note that this is blocking, meaning that only
   * one command can be executed at a time.
   */
  async exec(args: string[], env?: Record<string, string>) {
    if (this.execUtilResolve) {
      throw new Error("Cannot execute multiple commands at once");
    }

    const chan = await this.startUtil("exec");

    this.execUtilOutput = "";

    const promises = await Promise.all([
      new Promise((resolve, reject) => {
        this.execUtilResolve = resolve;
        this.execUtilReject = reject;
      }),
      chan.send({
        exec: {
          args,
          env,
        },
      }),
    ]);

    return promises[0];
  }

  /**
   * Gets the edit history of a file.
   * @param path The path of the file
   * @param from From which version to start
   * @param to Until which version to get
   * @returns An array of OT packets
   */
  async getFileHistory(path: string, from = 1, to?: number) {
    path = normalizePath(path);

    // If no to version is specified, get until
    // the latest version that we know about
    to = to ?? this.getLatestFileVersion(path);

    const chan = await this.startUtil("ot", `ot:${path}`);

    const resp = await chan.send({
      otFetchRequest: {
        versionFrom: from,
        versionTo: to,
      },
    });

    return resp.otFetchResponse?.packets;
  }

  /**
   * Gets the latest version of a file
   * that this client knows about. Meaning
   * that if the file was edited by another
   * client, this will not return the latest
   * version until we've received the OT
   * packets from the other client.
   *
   * Will return null if the client hasn't
   * received any OT packets for the file.
   */
  getLatestFileVersion(path: string): number | null {
    path = normalizePath(path);

    return this.otStatuses[path]?.version ?? null;
  }
}

export { Crosis };
