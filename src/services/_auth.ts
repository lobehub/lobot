import { CLIENT_VERSION_HEADER, CURRENT_VERSION } from '@lobechat/const';

interface AuthParams {
  headers?: HeadersInit;
}

export const createHeaderWithAuth = async (params?: AuthParams): Promise<HeadersInit> => {
  const headers = new Headers(params?.headers);
  headers.set(CLIENT_VERSION_HEADER, CURRENT_VERSION);

  return Object.fromEntries(headers.entries());
};
