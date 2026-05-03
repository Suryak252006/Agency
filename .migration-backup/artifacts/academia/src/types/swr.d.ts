declare module 'swr' {
  export interface SWRResponse<Data = any> {
    data: Data | undefined;
    error: any;
    isLoading: boolean;
    isValidating: boolean;
    mutate: (data?: Data | Promise<Data>, opts?: any) => Promise<Data | undefined>;
  }

  type Fetcher<Data> = (...args: any[]) => Data | Promise<Data>;

  function useSWR<Data = any>(key: string | null, fetcher: Fetcher<Data>): SWRResponse<Data>;
  function useSWR<Data = any>(key: string | null, fetcher: Fetcher<Data>, options: any): SWRResponse<Data>;

  export function mutate(key: string, data?: any, opts?: any): Promise<any>;

  export default useSWR;
}
