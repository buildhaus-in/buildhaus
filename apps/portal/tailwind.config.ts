import type { Config } from "tailwindcss";
import { buildhausPreset } from "@buildhaus/brand/tailwind-preset";

const config: Config = {
  presets: [buildhausPreset as Config],
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};
export default config;
