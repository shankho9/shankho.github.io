// OAuth Provider Types
export type OAuthProvider = 'google' | 'apple' | 'outlook' | 'github'

export interface OAuthProviderConfig {
  name: string
  icon: string
  color: string
  bgColor: string
  hoverColor: string
  clientId?: string
  enabled: boolean
}

export interface OAuthButtonProps {
  provider: OAuthProvider
  buttonId?: string
  size?: 'small' | 'medium' | 'large'
  theme?: 'outline' | 'filled'
  fullWidth?: boolean
}

export interface OAuthCredential {
  provider: OAuthProvider
  token: string
  code?: string
}
