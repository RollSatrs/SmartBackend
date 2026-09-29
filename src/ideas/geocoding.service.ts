import { Injectable, Logger } from '@nestjs/common';

interface NominatimResponse {
  display_name?: string;
  address?: {
    district?: string;
    city_district?: string;
    state_district?: string;
    county?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
  };
}

interface NominatimSearchResponse {
  display_name?: unknown;
  lat?: unknown;
  lon?: unknown;
}

export interface GeocodingSearchResult {
  displayName: string;
  lat: number;
  lng: number;
}

const SEMEY_VIEWBOX = '80.1079969,50.4789706,80.4604285,50.3329157';

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly cache = new Map<string, string>();
  private readonly searchCache = new Map<string, GeocodingSearchResult[]>();
  private queue = Promise.resolve();
  private lastRequestAt = 0;

  reverse(lat: number, lng: number): Promise<string> {
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    const cached = this.cache.get(key);
    if (cached) return Promise.resolve(cached);

    const request = this.enqueue(() => this.requestDistrict(lat, lng));
    return request.then((district) => {
      this.cache.set(key, district);
      return district;
    });
  }

  search(query: string): Promise<GeocodingSearchResult[]> {
    const trimmedQuery = query.trim();
    const key = trimmedQuery.toLocaleLowerCase('ru');
    const cached = this.searchCache.get(key);
    if (cached) return Promise.resolve(cached);

    const request = this.enqueue(() => this.requestSearch(trimmedQuery));
    return request.then((results) => {
      this.searchCache.set(key, results);
      return results;
    });
  }

  private enqueue<T>(request: () => Promise<T>): Promise<T> {
    const queued = this.queue.then(request);
    this.queue = queued.then(
      () => undefined,
      () => undefined,
    );
    return queued;
  }

  private async requestDistrict(lat: number, lng: number): Promise<string> {
    await this.waitForRateLimit();

    const baseUrl =
      process.env.NOMINATIM_URL ?? 'https://nominatim.openstreetmap.org';
    const url = new URL('/reverse', baseUrl);
    url.search = new URLSearchParams({
      format: 'jsonv2',
      lat: String(lat),
      lon: String(lng),
      addressdetails: '1',
      layer: 'address',
      'accept-language': 'ru',
    }).toString();

    try {
      const response = await this.fetchNominatim(url);

      const data = (await response.json()) as NominatimResponse;
      const address = data.address;
      return (
        address?.district ??
        address?.city_district ??
        address?.state_district ??
        address?.county ??
        address?.suburb ??
        address?.city ??
        address?.town ??
        address?.village ??
        data.display_name ??
        'Не определён'
      );
    } catch (error) {
      this.logger.warn(
        `Не удалось определить район: ${error instanceof Error ? error.message : String(error)}`,
      );
      return 'Не определён';
    }
  }

  private async requestSearch(query: string): Promise<GeocodingSearchResult[]> {
    await this.waitForRateLimit();

    const baseUrl =
      process.env.NOMINATIM_URL ?? 'https://nominatim.openstreetmap.org';
    const url = new URL('/search', baseUrl);
    url.search = new URLSearchParams({
      q: query,
      format: 'jsonv2',
      limit: '5',
      countrycodes: 'kz',
      viewbox: SEMEY_VIEWBOX,
      bounded: '1',
      'accept-language': 'ru',
    }).toString();

    try {
      const response = await this.fetchNominatim(url);
      const data = (await response.json()) as NominatimSearchResponse[];

      return data.flatMap((item) => {
        const lat = Number(item.lat);
        const lng = Number(item.lon);
        if (
          typeof item.display_name !== 'string' ||
          !Number.isFinite(lat) ||
          !Number.isFinite(lng)
        ) {
          return [];
        }
        return [{ displayName: item.display_name, lat, lng }];
      });
    } catch (error) {
      this.logger.warn(
        `Не удалось найти адрес: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  private async waitForRateLimit() {
    const waitMs = Math.max(0, this.lastRequestAt + 1000 - Date.now());
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
    this.lastRequestAt = Date.now();
  }

  private async fetchNominatim(url: URL) {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'SmartCityHackathon/1.0 (+https://github.com/RollSatrs/SmartBackend)',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`Nominatim returned ${response.status}`);
    return response;
  }
}
