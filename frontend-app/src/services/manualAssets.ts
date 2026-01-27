import { api } from './api'
import { ManualAsset } from '../types'

type ManualAssetPayload = {
  assetType: string
  balanceType: 'asset' | 'liability'
  name: string
  value: number
  purchaseDate?: string | null
  notes?: string | null
}

const mapManualAsset = (data: any): ManualAsset => ({
  id: data.id,
  uid: data.uid,
  assetType: data.asset_type ?? data.assetType,
  balanceType: data.balance_type ?? data.balanceType ?? 'asset',
  name: data.name,
  value: typeof data.value === 'number' ? data.value : Number(data.value || 0),
  purchaseDate: data.purchase_date ?? data.purchaseDate ?? null,
  notes: data.notes ?? null,
  createdAt: data.created_at ?? data.createdAt,
  updatedAt: data.updated_at ?? data.updatedAt,
})

export const getManualAssets = async (): Promise<ManualAsset[]> => {
  const { data } = await api.get('/manual-assets')
  return Array.isArray(data) ? data.map(mapManualAsset) : []
}

export const createManualAsset = async (payload: ManualAssetPayload): Promise<ManualAsset> => {
  const { data } = await api.post('/manual-assets', {
    asset_type: payload.assetType,
    balance_type: payload.balanceType,
    name: payload.name,
    value: payload.value,
    purchase_date: payload.purchaseDate,
    notes: payload.notes,
  })
  return mapManualAsset(data)
}

export const updateManualAsset = async (
  id: string,
  payload: Partial<ManualAssetPayload>,
): Promise<ManualAsset> => {
  const { data } = await api.patch(`/manual-assets/${id}`, {
    asset_type: payload.assetType,
    balance_type: payload.balanceType,
    name: payload.name,
    value: payload.value,
    purchase_date: payload.purchaseDate,
    notes: payload.notes,
  })
  return mapManualAsset(data)
}

export const deleteManualAsset = async (id: string): Promise<void> => {
  await api.delete(`/manual-assets/${id}`)
}
