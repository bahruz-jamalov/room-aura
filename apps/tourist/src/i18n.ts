import { initI18n } from "@room-aura/i18n";
import { LOCALE_STORAGE_KEY } from "./lib/constants";

initI18n(localStorage.getItem(LOCALE_STORAGE_KEY) ?? "en");
