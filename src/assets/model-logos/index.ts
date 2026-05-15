
import openai from './openai.png';
import anthropic from './anthropic.png';
import google from './google.png';
import mistral from './mistral.png';
import meta from './meta.png';
import cohere from './cohere.png';

export const PROVIDER_LOGOS: Record<string, { src: string } | string> = {
    openai,
    gpt: openai, // Alias for ChatGPT models
    anthropic,
    claude: anthropic, // Alias for Claude models
    google,
    gemini: google, // Alias for Gemini models
    mistral,
    meta,
    cohere
};
