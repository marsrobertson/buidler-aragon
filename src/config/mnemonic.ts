import { homedir } from 'os'
import path from 'path'
import { ConfigExtender, HttpNetworkConfig } from '@nomiclabs/buidler/types'
import { aragenMnemonic } from '../params'
import { readJsonIfExists } from '../utils/fsUtils'
import { isHexString } from 'ethers/utils'

// Standard Aragon test paths
const aragonConfig = '.aragon'
const genericName = 'mnemonic.json'
const byNetworkName = (network: string): string => `${network}_key.json`
const defaultMnemonic = aragenMnemonic

interface GenericMnemonic {
  mnemonic: string
}
interface ByNetworkMnemonic {
  rpc?: string
  keys?: string[] // privateKeys = [ "3f841bf589fdf83a521e55d51afddc34fa65351161eead24f064855fc29c9580" ];
}

export const configExtender: ConfigExtender = (finalConfig, userConfig) => {
  const genericMnemonic = readAragonConfig<GenericMnemonic>(genericName)

  // Add mnemonics from .aragon config only to selected networks
  for (const networkName of ['mainnet', 'ropsten', 'rinkeby', 'kovan']) {
    // Apply defaults. Note networks may not exists in finalConfig
    const finalNetwork = {
      ...((userConfig.networks || {})[networkName] || {}),
      // Add finalConfig in case a previous configExtender has modified it
      ...((finalConfig.networks || {})[networkName] || {})
    } as HttpNetworkConfig

    // Apply account data from the config folder
    const byNetworkMnemonic = readAragonConfig<ByNetworkMnemonic>(
      byNetworkName(networkName)
    )
    if (byNetworkMnemonic) {
      const { rpc, keys } = byNetworkMnemonic
      if (!finalNetwork.url && rpc) finalNetwork.url = rpc
      if (!finalNetwork.accounts && keys)
        finalNetwork.accounts = ensureHexEncoding(keys)
    }
    // Generic mnemonic
    if (genericMnemonic && !finalNetwork.accounts) {
      finalNetwork.accounts = genericMnemonic
    }
    // Fallback mnemonic
    if (!finalNetwork.accounts) {
      finalNetwork.accounts = {
        mnemonic: defaultMnemonic
      }
    }

    // Since finalNetwork is new reference (due to { ... }) re-assign to finalConfig
    if (!finalConfig.networks) finalConfig.networks = {}
    finalConfig.networks[networkName] = finalNetwork
  }
}

/**
 * Utility to read JSON files from aragonConfig dirs
 * Returns undefined if the file does not exist
 * @param filename 'mnemonic.json'
 */
function readAragonConfig<T>(filename: string): T | undefined {
  return readJsonIfExists(path.join(homedir(), aragonConfig, filename))
}

/**
 * Utility to read JSON files from aragonConfig dirs
 * Returns undefined if the file does not exist
 * @param filename 'mnemonic.json'
 */
const ensureHexEncoding = (keys: string[]): string[] =>
  keys.map(key => (isHexString(key) ? key : `0x${key}`))
