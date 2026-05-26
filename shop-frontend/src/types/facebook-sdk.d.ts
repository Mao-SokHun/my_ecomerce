export {};

declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (params: {
        appId: string;
        cookie?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: {
          authResponse?: { accessToken: string; userID: string } | null;
          status: string;
        }) => void,
        options?: { scope?: string }
      ) => void;
      getLoginStatus: (
        callback: (response: {
          authResponse?: { accessToken: string; userID: string } | null;
          status: string;
        }) => void
      ) => void;
    };
  }
}
