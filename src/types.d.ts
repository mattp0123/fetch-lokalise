export interface Translation {
  language_iso: string;
  translation: string;
}

export interface Key {
  key_name: {
    ios: string;
    android: string;
    web: string;
    other: string;
  };
  translations: Translation[];
}

export interface ListKeysResponse {
  keys: Key[];
}

export interface LangToTranslationsMap {
  [lang: string]: {
    [key: string]: string;
  };
}
