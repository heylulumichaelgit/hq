"use client";

import { createStore, get, set, del } from "idb-keyval";

const store = createStore("hq-query-cache", "react-query");

export const offlineStore = {
  getItem: async (key: string): Promise<string | null> => {
    const value = await get<string>(key, store);
    return value ?? null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await set(key, value, store);
  },
  removeItem: async (key: string): Promise<void> => {
    await del(key, store);
  },
};
