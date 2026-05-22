export const translations = {
    en: {
        common: {
            welcome: "Welcome to Spectacl",
            loading: "Loading...",
            error: "An error occurred",
            save: "Save",
            cancel: "Cancel",
        },
        navigation: {
            overview: "Overview",
            competitors: "Competitors",
            prompts: "Prompts",
            settings: "Settings",
        },
    },
};

export type Translations = typeof translations;
export type Locale = keyof Translations;
