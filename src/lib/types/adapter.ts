export type Adapter = () => Promise<AdapterResult>;

export interface AdapterResult {
  url?: string;
}
