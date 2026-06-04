export type PrimeContractorStampOption = {
  id: string
  displayName: string
}

export type Site = {
  id: string
  name: string
  address: string
  active: boolean
  primeContractorStampOptions: PrimeContractorStampOption[]
}
