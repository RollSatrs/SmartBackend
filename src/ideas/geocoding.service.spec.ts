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

  it('ищет адреса только в Семее, преобразует координаты и кэширует запрос', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            display_name: 'проспект Абая, Семей, Абай облысы, Қазақстан',
            lat: '50.4111',
            lon: '80.2275',
          },
          { display_name: 'Некорректный результат', lat: 'x', lon: 'y' },
        ]),
    } as Response);
    const service = new GeocodingService();

    const expected = [
      {
        displayName: 'проспект Абая, Семей, Абай облысы, Қазақстан',
        lat: 50.4111,
        lng: 80.2275,
      },
    ];
    await expect(service.search('Абая')).resolves.toEqual(expected);
    await expect(service.search('  абая  ')).resolves.toEqual(expected);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = fetchMock.mock.calls[0][0] as URL;
    expect(url.pathname).toBe('/search');
    expect(url.searchParams.get('q')).toBe('Абая');
    expect(url.searchParams.get('viewbox')).toBe(
      '80.1079969,50.4789706,80.4604285,50.3329157',
    );
    expect(url.searchParams.get('bounded')).toBe('1');
    expect(url.searchParams.get('countrycodes')).toBe('kz');
  });

  it('возвращает пустой список при ошибке поиска', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('timeout'));
    const service = new GeocodingService();

    await expect(service.search('Абая')).resolves.toEqual([]);
  });
});
