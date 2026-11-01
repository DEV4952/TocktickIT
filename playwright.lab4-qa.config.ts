import { defineConfig } from "@playwright/test";
import base from "./playwright.lab4.config";
export default defineConfig({ ...base, testMatch: ["release-audit.spec.ts"], timeout: 180000 });
