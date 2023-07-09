import { WebSocket } from 'ws';
import type { CrosisOptions, Adapter } from "./lib/types"

const defaultOptions: CrosisOptions = {
  autoConnect: true,
};

class Crosis {
  private url: string | null;
  private adapter: Adapter;
  private ws: WebSocket;

  constructor(options: CrosisOptions) {
    options = {
      ...defaultOptions,
      ...options
    };

    this.adapter = options.adapter;

    this.url = options.url || undefined;
    this.ws = null;
  }

  async connect() {
    const adapterResult = this.adapter
      ? await this.adapter()
      : null;

    
  }
}
