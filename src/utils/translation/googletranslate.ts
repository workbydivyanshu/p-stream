import { TranslateService } from ".";

const SINGLE_API_URL =
  "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&dj=1&ie=UTF-8&oe=UTF-8&sl=auto";
const BATCH_API_URL = "https://translate-pa.googleapis.com/v1/translateHtml";
const BATCH_API_KEY = "AIzaSyATBXajvzQLTDHEQbcpq0Ihe0vWDHmO520";

export default {
  getName() {
    return "Google Translate";
  },

  getConfig() {
    return {
      singleBatchSize: 15,
      multiBatchSize: 80,
      maxRetryCount: 3,
      batchSleepMs: 200,
    };
  },

  async translate(str, targetLang) {
    if (!str) {
      return "";
    }

    const response = await (
      await fetch(
        `${SINGLE_API_URL}&tl=${targetLang}&q=${encodeURIComponent(str)}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        },
      )
    ).json();

    if (!response.sentences) {
      console.warn("Invalid gt response", response);
      throw new Error("Invalid response");
    }

    return (response.sentences as any[])
      .map((s: any) => s.trans as string)
      .join("");
  },

  async translateMulti(batch, targetLang) {
    if (!batch || batch.length === 0) {
      return [];
    }

    const response = await (
      await fetch(BATCH_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json+protobuf",
          "X-goog-api-key": BATCH_API_KEY,
        },
        body: JSON.stringify([[batch, "auto", targetLang], "te"]),
      })
    ).json();

    if (!Array.isArray(response) || response.length < 1) {
      console.warn("Invalid gt batch response", response);
      throw new Error("Invalid response");
    }

    return response[0].map((s: any) => s as string);
  },
} satisfies TranslateService;
