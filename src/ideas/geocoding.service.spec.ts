import { GeocodingService } from './geocoding.service';

describe('GeocodingService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('возвращает район из ответа Nominatim и кэширует координаты', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ address: { city_district: 'Абайский район' } }),
    } as Response);
    const service = new GeocodingService();

    await expect(service.reverse(50.4111, 80.2275)).resolves.toBe(
      'Абайский район',
    );
    await expect(service.reverse(50.4111, 80.2275)).resolves.toBe(
      'Абайский район',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('не блокирует создание идеи при ошибке внешнего сервиса', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('timeout'));
    const service = new GeocodingService();

    await expect(service.reverse(50.4111, 80.2275)).resolves.toBe(
      'Не определён',
    );
  });
});
