import { WebSocket } from 'ws';
import type { CrosisOptions } from "./lib/types"

const defaultOptions: CrosisOptions = {
  autoConnect: true,
};

class Crosis {
  public ws: WebSocket;
  public url: string;

  constructor(options: CrosisOptions) {
    options = {
      ...defaultOptions,
      ...options
    };

    this.url = options.url || "" // TODO

    if (options.autoConnect) {
      this.ws = new WebSocket(this.url);
    } else {
      this.ws = null;
    }
  }
}
