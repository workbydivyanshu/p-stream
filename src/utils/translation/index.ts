import subsrt from "subsrt-ts";
import { Caption, ContentCaption } from "subsrt-ts/dist/types/handler";

import { Caption as PlayerCaption } from "@/stores/player/slices/source";

import { compressStr, decompressStr, sleep } from "./utils";

const CAPTIONS_CACHE: Map<string, ArrayBuffer> = new Map<string, ArrayBuffer>();

export interface TranslateService {
  getName(): string;
  getConfig(): {
    singleBatchSize: number;
    multiBatchSize: number; // -1 = unsupported
    maxRetryCount: number;
    batchSleepMs: number;
  };
  translate(str: string, targetLang: string): Promise<string>;
  translateMulti(batch: string[], targetLang: string): Promise<string[]>;
}

class Translator {
  private captions: Caption[];

  private contentCaptions: ContentCaption[] = [];

  private contentCache: Map<string, string> = new Map<string, string>();

  private targetLang: string;

  private service: TranslateService;

  constructor(srtData: string, targetLang: string, service: TranslateService) {
    this.captions = subsrt.parse(srtData);
    this.targetLang = targetLang;
    this.service = service;

    for (const caption of this.captions) {
      if (caption.type !== "caption") {
        continue;
      }
      // Normalize line endings
      caption.text = caption.text
        .trim()
        .replaceAll("\r\n", "\n")
        .replaceAll("\r", "\n");
      this.contentCaptions.push(caption);
    }
  }

  fillContentFromCache(content: ContentCaption): boolean {
    const text: string | undefined = this.contentCache.get(content.text);
    if (text) {
      content.text = text;
      return true;
    }
    return false;
  }

  async translateContent(content: ContentCaption): Promise<boolean> {
    let result;
    let attempts = 0;
    const errors: any[] = [];

    while (!result && attempts < 3) {
      try {
        result = await this.service.translate(content.text, this.targetLang);
      } catch (err) {
        console.warn("Translation attempt failed");
        errors.push(err);
        await sleep(500);
        attempts += 1;
      }
    }

    if (!result) {
      console.warn("Translation failed", errors);
      return false;
    }

    content.text = result;
    this.contentCache.set(content.text, result);
    return true;
  }

  async translateContentBatch(batch: ContentCaption[]): Promise<boolean> {
    try {
      const result = await this.service.translateMulti(
        batch.map((content) => content.text),
        this.targetLang,
      );

      if (result.length !== batch.length) {
        console.warn(
          "Batch translation size mismatch",
          result.length,
          batch.length,
        );
        return false;
      }

      for (let i = 0; i < batch.length; i += 1) {
        batch[i].text = result[i];
        this.contentCache.set(batch[i].text, result[i]);
      }

      return true;
    } catch (err) {
      console.warn("Batch translation failed", err);
      return false;
    }
  }

  takeBatch(): ContentCaption[] {
    const batch: ContentCaption[] = [];
    const batchSize =
      this.service.getConfig().multiBatchSize === -1
        ? this.service.getConfig().singleBatchSize
        : this.service.getConfig().multiBatchSize;

    let count = 0;
    while (count < batchSize && this.contentCaptions.length > 0) {
      const content: ContentCaption = this.contentCaptions.shift()!;
      if (this.fillContentFromCache(content)) {
        continue;
      }
      batch.push(content);
      count += 1;
    }

    return batch;
  }

  async translate(): Promise<string | undefined> {
    let batch: ContentCaption[] = this.takeBatch();
    while (batch.length > 0) {
      let result: boolean;
      console.info("Translating captions batch", batch.length, batch);

      if (this.service.getConfig().multiBatchSize === -1) {
        result = (
          await Promise.all(
            batch.map((content) => this.translateContent(content)),
          )
        ).every((res) => res);
      } else {
        result = await this.translateContentBatch(batch);
      }

      if (!result) {
        console.error(
          "Failed to translate captions batch",
          batch.length,
          batch,
        );
        return undefined;
      }

      batch = this.takeBatch();
      await sleep(this.service.getConfig().batchSleepMs);
    }
    return subsrt.build(this.captions, { format: "srt" });
  }
}

export async function translate(
  caption: PlayerCaption,
  targetLang: string,
  service: TranslateService,
): Promise<string | undefined> {
  const cacheID = `${caption.id}_${targetLang}`;

  const cachedData: ArrayBuffer | undefined = CAPTIONS_CACHE.get(cacheID);
  if (cachedData) {
    return decompressStr(cachedData);
  }

  const translator = new Translator(caption.srtData, targetLang, service);

  const result = await translator.translate();
  if (!result) {
    return undefined;
  }

  CAPTIONS_CACHE.set(cacheID, await compressStr(result));
  return result;
}
