
import { Configuration, OpenAIApi } from "openai";
const configuration = new Configuration({
    organization: "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",
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const response = await openai.listEngines();