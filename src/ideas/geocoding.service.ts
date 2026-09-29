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

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly cache = new Map<string, string>();
  private queue = Promise.resolve();
  private lastRequestAt = 0;

  reverse(lat: number, lng: number): Promise<string> {
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    const cached = this.cache.get(key);
    if (cached) return Promise.resolve(cached);

    const request = this.queue.then(() => this.requestDistrict(lat, lng));
    this.queue = request.then(
      () => undefined,
      () => undefined,
    );
    return request.then((district) => {
      this.cache.set(key, district);
      return district;
    });
  }

  private async requestDistrict(lat: number, lng: number): Promise<string> {
    const waitMs = Math.max(0, this.lastRequestAt + 1000 - Date.now());
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
    this.lastRequestAt = Date.now();

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
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'SmartCityHackathon/1.0 (+https://github.com/RollSatrs/SmartBackend)',
        },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok)
        throw new Error(`Nominatim returned ${response.status}`);

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
}
