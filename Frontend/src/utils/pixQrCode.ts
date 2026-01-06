/**
 * 🏦 PIX QR Code Generator - HOLD Wallet
 * ========================================
 *
 * Gera QR Code PIX seguindo o padrão EMV do Banco Central do Brasil.
 * Funciona SEM necessidade de API do banco para QR Codes estáticos.
 *
 * Documentação: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf
 *
 * @version 1.0.0
 */

import QRCode from 'qrcode'

// ============================================================================
// TIPOS
// ============================================================================

interface PixPayload {
  /** Chave PIX (CNPJ, CPF, telefone, email ou chave aleatória) */
  pixKey: string
  /** Nome do recebedor (até 25 caracteres) */
  merchantName: string
  /** Cidade do recebedor (até 15 caracteres) */
  merchantCity: string
  /** Valor da transação (opcional para QR estático) */
  amount?: number
  /** ID da transação para identificação (até 25 caracteres) */
  txId?: string
  /** Descrição adicional */
  description?: string
}

// ============================================================================
// CONSTANTES EMV PIX
// ============================================================================

// IDs dos campos EMV para PIX
const EMV_IDS = {
  PAYLOAD_FORMAT_INDICATOR: '00',
  MERCHANT_ACCOUNT_INFO: '26',
  MERCHANT_CATEGORY_CODE: '52',
  TRANSACTION_CURRENCY: '53',
  TRANSACTION_AMOUNT: '54',
  COUNTRY_CODE: '58',
  MERCHANT_NAME: '59',
  MERCHANT_CITY: '60',
  ADDITIONAL_DATA_FIELD: '62',
  CRC16: '63',
}

// Sub-IDs do Merchant Account Info (campo 26)
const MERCHANT_ACCOUNT_IDS = {
  GUI: '00', // Globally Unique Identifier
  KEY: '01', // Chave PIX
  DESCRIPTION: '02', // Descrição (opcional)
}

// Sub-IDs do Additional Data Field (campo 62)
const ADDITIONAL_DATA_IDS = {
  TXID: '05', // ID da transação
}

// GUI do PIX (identificador global)
const PIX_GUI = 'br.gov.bcb.pix'

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Formata um campo EMV: ID + Tamanho (2 dígitos) + Valor
 */
function formatEmvField(id: string, value: string): string {
  const length = value.length.toString().padStart(2, '0')
  return `${id}${length}${value}`
}

/**
 * Calcula CRC16-CCITT para validação do QR Code PIX
 * Polinômio: 0x1021
 */
function calculateCRC16(payload: string): string {
  const polynomial = 0x1021
  let crc = 0xffff

  // Adiciona o campo CRC vazio para o cálculo
  const data = payload + EMV_IDS.CRC16 + '04'

  for (let i = 0; i < data.length; i++) {
    const charCode = data.codePointAt(i) ?? 0
    crc ^= charCode << 8

    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) === 0) {
        crc = (crc << 1) & 0xffff
      } else {
        crc = ((crc << 1) ^ polynomial) & 0xffff
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/**
 * Remove caracteres especiais e limita tamanho
 */
function sanitizeString(str: string, maxLength: number): string {
  return str
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '') // Remove acentos
    .replaceAll(/[^a-zA-Z0-9 ]/g, '') // Remove caracteres especiais
    .substring(0, maxLength)
    .toUpperCase()
}

/**
 * Sanitiza o TXID - apenas letras e números, sem espaços
 */
function sanitizeTxId(str: string, maxLength: number): string {
  return str
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '') // Remove acentos
    .replaceAll(/[^a-zA-Z0-9]/g, '') // Remove TUDO exceto letras e números
    .substring(0, maxLength)
}

// ============================================================================
// FUNÇÕES PRINCIPAIS
// ============================================================================

/**
 * Gera o payload do QR Code PIX seguindo padrão EMV
 */
export function generatePixPayload(data: PixPayload): string {
  const { pixKey, merchantName, merchantCity, amount, txId, description } = data

  // Campo 00 - Payload Format Indicator (fixo: 01)
  let payload = formatEmvField(EMV_IDS.PAYLOAD_FORMAT_INDICATOR, '01')

  // Campo 26 - Merchant Account Information (PIX)
  let merchantAccountInfo = formatEmvField(MERCHANT_ACCOUNT_IDS.GUI, PIX_GUI)
  merchantAccountInfo += formatEmvField(MERCHANT_ACCOUNT_IDS.KEY, pixKey)

  if (description) {
    merchantAccountInfo += formatEmvField(
      MERCHANT_ACCOUNT_IDS.DESCRIPTION,
      sanitizeString(description, 72)
    )
  }

  payload += formatEmvField(EMV_IDS.MERCHANT_ACCOUNT_INFO, merchantAccountInfo)

  // Campo 52 - Merchant Category Code (0000 = não informado)
  payload += formatEmvField(EMV_IDS.MERCHANT_CATEGORY_CODE, '0000')

  // Campo 53 - Transaction Currency (986 = BRL)
  payload += formatEmvField(EMV_IDS.TRANSACTION_CURRENCY, '986')

  // Campo 54 - Transaction Amount (opcional)
  if (amount && amount > 0) {
    payload += formatEmvField(EMV_IDS.TRANSACTION_AMOUNT, amount.toFixed(2))
  }

  // Campo 58 - Country Code (BR)
  payload += formatEmvField(EMV_IDS.COUNTRY_CODE, 'BR')

  // Campo 59 - Merchant Name
  payload += formatEmvField(EMV_IDS.MERCHANT_NAME, sanitizeString(merchantName, 25))

  // Campo 60 - Merchant City
  payload += formatEmvField(EMV_IDS.MERCHANT_CITY, sanitizeString(merchantCity, 15))

  // Campo 62 - Additional Data Field (TXID)
  if (txId) {
    const additionalData = formatEmvField(ADDITIONAL_DATA_IDS.TXID, sanitizeTxId(txId, 25))
    payload += formatEmvField(EMV_IDS.ADDITIONAL_DATA_FIELD, additionalData)
  }

  // CRC16 para validação do payload
  const crc = calculateCRC16(payload)
  payload += formatEmvField(EMV_IDS.CRC16, crc)

  return payload
}

/**
 * Gera QR Code PIX como Data URL (base64)
 */
export async function generatePixQRCode(data: PixPayload): Promise<string> {
  const payload = generatePixPayload(data)

  try {
    const qrCodeDataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 256,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })

    return qrCodeDataUrl
  } catch (error) {
    console.error('[PIX QR Code] Error generating QR Code:', error)
    throw new Error('Erro ao gerar QR Code PIX')
  }
}

/**
 * Gera QR Code PIX como SVG string
 */
export async function generatePixQRCodeSVG(data: PixPayload): Promise<string> {
  const payload = generatePixPayload(data)

  try {
    const svg = await QRCode.toString(payload, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 256,
    })

    return svg
  } catch (error) {
    console.error('[PIX QR Code] Error generating QR Code SVG:', error)
    throw new Error('Erro ao gerar QR Code PIX')
  }
}

/**
 * Dados bancários da HOLD Digital Assets para PIX
 */
export const HOLD_PIX_DATA = {
  pixKey: '24275355000151', // CNPJ como chave PIX (SEM formatação - apenas números)
  merchantName: 'HOLD DIGITAL ASSETS',
  merchantCity: 'SAO PAULO',
}

/**
 * Gera QR Code PIX para uma transação da HOLD
 */
export async function generateHoldPixQRCode(amount?: number, txId?: string): Promise<string> {
  const payload: PixPayload = {
    ...HOLD_PIX_DATA,
  }

  if (amount !== undefined) {
    payload.amount = amount
  }

  if (txId !== undefined) {
    payload.txId = txId
    payload.description = `Ordem ${txId}`
  }

  return generatePixQRCode(payload)
}

/**
 * Gera o payload PIX Copia e Cola para uma transação da HOLD
 */
export function generateHoldPixPayload(amount?: number, txId?: string): string {
  const payload: PixPayload = {
    ...HOLD_PIX_DATA,
  }

  if (amount !== undefined) {
    payload.amount = amount
  }

  if (txId !== undefined) {
    payload.txId = txId
    payload.description = `Ordem ${txId}`
  }

  return generatePixPayload(payload)
}

export default {
  generatePixPayload,
  generatePixQRCode,
  generatePixQRCodeSVG,
  generateHoldPixQRCode,
  generateHoldPixPayload,
  HOLD_PIX_DATA,
}
