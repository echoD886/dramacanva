import { create } from "zustand";

// Public skill copy and route metadata must share the resolved setting across SPA navigation.
export const usePublicSkillBrandStore = create<{ brandName?: string }>(() => ({}));
