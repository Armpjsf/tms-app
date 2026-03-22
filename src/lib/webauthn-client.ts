import { 
  startRegistration, 
  startAuthentication 
} from '@simplewebauthn/browser'
import { 
  getPasskeyRegistrationOptions, 
  verifyPasskeyRegistration,
  getPasskeyAuthenticationOptions,
  verifyPasskeyLogin
} from '@/lib/actions/auth-biometric-actions'

/**
 * Register a new passkey for the current user
 */
export async function registerBiometrics() {
  try {
    // 1. Get options from server
    const options = await getPasskeyRegistrationOptions()
    
    // 2. Trigger browser biometrics prompt
    const attResp = await startRegistration({ optionsJSON: options })
    
    // 3. Verify with server
    const verification = await verifyPasskeyRegistration(attResp)
    
    return verification
  } catch (error: unknown) {
    console.error('Registration Error:', error)
    const err = error as Error
    if (err.name === 'InvalidStateError') {
      throw new Error('This device is already registered')
    }
    throw err
  }
}

/**
 * Authenticate using a passkey
 */
export async function authenticateBiometrics(identifier: string) {
  try {
    // 1. Get options from server
    const options = await getPasskeyAuthenticationOptions(identifier)
    
    // 2. Trigger browser biometrics prompt
    const asseResp = await startAuthentication({ optionsJSON: options })
    
    // 3. Verify with server
    const verification = await verifyPasskeyLogin(asseResp)
    
    return verification
  } catch (error: unknown) {
    console.error('Authentication Error:', error)
    throw error
  }
}
