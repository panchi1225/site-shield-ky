export type WeatherOptionValue = '' | '晴れ' | 'くもり' | '雨' | '雪' | 'その他'

export const weatherOptions: Array<{
  label: string
  value: WeatherOptionValue
}> = [
  { label: '空欄', value: '' },
  { label: '晴れ', value: '晴れ' },
  { label: 'くもり', value: 'くもり' },
  { label: '雨', value: '雨' },
  { label: '雪', value: '雪' },
  { label: 'その他', value: 'その他' },
]

const fixedWeatherValues = new Set<WeatherOptionValue>([
  '',
  '晴れ',
  'くもり',
  '雨',
  '雪',
])

export function getWeatherInputState(weather: string | null | undefined): {
  otherValue: string
  option: WeatherOptionValue
} {
  const trimmedWeather = weather?.trim() ?? ''

  if (fixedWeatherValues.has(trimmedWeather as WeatherOptionValue)) {
    return {
      option: trimmedWeather as WeatherOptionValue,
      otherValue: '',
    }
  }

  return {
    option: 'その他',
    otherValue: trimmedWeather,
  }
}

export function resolveWeatherValue(
  option: WeatherOptionValue,
  otherValue: string,
) {
  return option === 'その他' ? otherValue.trim() : option
}

