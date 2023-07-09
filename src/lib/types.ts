export interface CrosisOptions {
  adapter?: Adapter;
  url?: string;
}

export type Adapter = () => Promise<AdapterResult>;

export interface AdapterResult {
  url?: string;
}
