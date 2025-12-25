import subsrt from "subsrt-ts";
import { Caption, ContentCaption } from "subsrt-ts/dist/types/handler";

const API_URL =
  "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&dj=1&ie=UTF-8&oe=UTF-8&sl=auto&tl={TARGET_LANG}&q=";
const RETRY_COUNT = 3;
const FETCH_RATE = 100;
const SUBTITLES_CACHE: Map<string, ArrayBuffer> = new Map<
  string,
  ArrayBuffer
>();

async function translateText(text: string): Promise<string | undefined> {
  if (!text) {
    return "";
  }

  const response = await (
    await fetch(
      `${API_URL.replace("TARGET_LANG", "ro")}${encodeURIComponent(text)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    )
  ).json();

  if (!response) {
    throw new Error("Empty response");
  }

  return (response.sentences as any[])
    .map((s: any) => s.trans as string)
    .join("");
}

async function translateCaption(caption: ContentCaption): Promise<boolean> {
  (caption as any).oldText = caption.text;
  let text: string | undefined;
  for (let i = 0; i < RETRY_COUNT; i += 1) {
    try {
      text = await translateText(caption.text.replace("\n", "<br>"));
      if (text) {
        text = text.replace("<br>", "\n");
        break;
      }
    } catch (error) {
      console.warn("[CTR] Re-trying caption translation", caption, error);
    }
  }
  if (!text) {
    console.error("[CTR] Failed to translate caption");
    caption.text = `(CAPTION COULD NOT BE TRANSLATED)\n${caption.text}}`;
    return false;
  }
  caption.text = text.trim();
  return true;
}

async function translateCaptions(captions: ContentCaption[]): Promise<boolean> {
  console.log("[CTR] Translating", captions.length, "captions");
  try {
    const results: boolean[] = await Promise.all(
      captions.map((c) => translateCaption(c)),
    );

    const successCount = results.filter((v) => v).length;
    const failedCount = results.length - successCount;
    const successPercentange = (successCount / results.length) * 100;
    const failedPercentange = (failedCount / results.length) * 100;
    console.log(
      "[CTR] Done translating captions",
      results.length,
      successCount,
      failedCount,
      successPercentange,
      failedPercentange,
    );

    if (failedPercentange > successPercentange) {
      throw new Error("Success percentage is not acceptable");
    }
  } catch (error) {
    console.error(
      "[CTR] Could not translate",
      captions.length,
      "captions",
      error,
    );
    return false;
  }
  return true;
}

function tryUseCached(
  caption: ContentCaption,
  cache: Map<string, string>,
): boolean {
  const text: string | undefined = cache.get(caption.text);
  if (text) {
    caption.text = text;
    return true;
  }
  return false;
}

async function translateSRTData(data: string): Promise<string | undefined> {
  let captions: Caption[];
  try {
    captions = subsrt.parse(data);
  } catch (error) {
    console.error("[CTR] Failed to parse subtitle data", error);
    return undefined;
  }

  let translatedCaptions: Caption[] | undefined = [];
  const contentCaptions: ContentCaption[] = [];
  const translatedCache: Map<string, string> = new Map<string, string>();

  for (const caption of captions) {
    translatedCaptions.push(caption);
    if (caption.type !== "caption") {
      continue;
    }
    caption.text = caption.text
      .trim()
      .replace("\r\n", "\n")
      .replace("\r", "\n");
    contentCaptions.push(caption);
  }

  for (let i = 0; i < contentCaptions.length; i += 1) {
    if (tryUseCached(contentCaptions[i], translatedCache)) {
      continue;
    }
    const batch: ContentCaption[] = [contentCaptions[i]];

    let j;
    for (j = 1; j < FETCH_RATE; j += 1) {
      if (i + j >= contentCaptions.length) {
        break;
      }
      if (tryUseCached(contentCaptions[i + j], translatedCache)) {
        continue;
      }
      batch.push(contentCaptions[i + j]);
    }
    i += j;

    if (!(await translateCaptions(batch))) {
      translatedCaptions = undefined;
      break;
    }

    batch.forEach((c) => translatedCache.set((c as any).oldText!, c.text));
  }

  return translatedCaptions
    ? subsrt.build(translatedCaptions, { format: "srt" })
    : undefined;
}

async function compressStr(string: string): Promise<ArrayBuffer> {
  const byteArray = new TextEncoder().encode(string);
  const cs = new CompressionStream("deflate");
  const writer = cs.writable.getWriter();
  writer.write(byteArray);
  writer.close();
  return new Response(cs.readable).arrayBuffer();
}

async function decompressStr(byteArray: ArrayBuffer): Promise<string> {
  const cs = new DecompressionStream("deflate");
  const writer = cs.writable.getWriter();
  writer.write(byteArray);
  writer.close();
  return new Response(cs.readable).arrayBuffer().then((arrayBuffer) => {
    return new TextDecoder().decode(arrayBuffer);
  });
}

export async function translateSubtitles(
  id: string,
  srtData: string,
): Promise<string | undefined> {
  const cachedData: ArrayBuffer | undefined = SUBTITLES_CACHE.get(id);
  if (cachedData) {
    console.log("[CTR] Using cached translation for", id);
    return decompressStr(cachedData);
  }
  console.log("[CTR] Translating", id);
  const translatedData: string | undefined = await translateSRTData(srtData);
  if (!translatedData) {
    return undefined;
  }
  console.log("[CTR] Caching translation for", id);
  SUBTITLES_CACHE.set(id, await compressStr(translatedData));
  return translatedData;
}
