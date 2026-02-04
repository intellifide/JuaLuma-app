const decodeBase64Url = (value: string): ArrayBuffer => {
  const padding = "=".repeat((4 - (value.length % 4)) % 4)
  const normalized = (value + padding).replace(/-/g, "+").replace(/_/g, "/")
  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

const encodeBase64Url = (value: ArrayBuffer): string => {
  const bytes = new Uint8Array(value)
  let binary = ""
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

const asPublicKeyCreationOptions = (raw: Record<string, unknown>): PublicKeyCredentialCreationOptions => {
  const options = raw as Record<string, any>
  return {
    ...options,
    challenge: decodeBase64Url(options.challenge),
    user: {
      ...options.user,
      id: decodeBase64Url(options.user.id),
    },
    excludeCredentials: Array.isArray(options.excludeCredentials)
      ? options.excludeCredentials.map((item: any) => ({
          ...item,
          id: decodeBase64Url(item.id),
        }))
      : undefined,
  } as PublicKeyCredentialCreationOptions
}

const asPublicKeyRequestOptions = (raw: Record<string, unknown>): PublicKeyCredentialRequestOptions => {
  const options = raw as Record<string, any>
  return {
    ...options,
    challenge: decodeBase64Url(options.challenge),
    allowCredentials: Array.isArray(options.allowCredentials)
      ? options.allowCredentials.map((item: any) => ({
          ...item,
          id: decodeBase64Url(item.id),
        }))
      : undefined,
  } as PublicKeyCredentialRequestOptions
}

export const createPasskeyCredential = async (
  rawOptions: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  const credential = (await navigator.credentials.create({
    publicKey: asPublicKeyCreationOptions(rawOptions),
  })) as PublicKeyCredential | null
  if (!credential) {
    throw new Error("Passkey creation was cancelled.")
  }
  const response = credential.response as AuthenticatorAttestationResponse
  return {
    id: credential.id,
    rawId: encodeBase64Url(credential.rawId),
    type: credential.type,
    response: {
      attestationObject: encodeBase64Url(response.attestationObject),
      clientDataJSON: encodeBase64Url(response.clientDataJSON),
    },
  }
}

export const getPasskeyAssertion = async (
  rawOptions: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  const credential = (await navigator.credentials.get({
    publicKey: asPublicKeyRequestOptions(rawOptions),
  })) as PublicKeyCredential | null
  if (!credential) {
    throw new Error("Passkey verification was cancelled.")
  }
  const response = credential.response as AuthenticatorAssertionResponse
  return {
    id: credential.id,
    rawId: encodeBase64Url(credential.rawId),
    type: credential.type,
    response: {
      authenticatorData: encodeBase64Url(response.authenticatorData),
      clientDataJSON: encodeBase64Url(response.clientDataJSON),
      signature: encodeBase64Url(response.signature),
      userHandle: response.userHandle ? encodeBase64Url(response.userHandle) : null,
    },
  }
}
