export type AgreementAcceptanceInput = {
  agreement_key: string
  agreement_version?: string
  acceptance_method?: string
  presented_at?: string
  metadata?: Record<string, unknown>
}
