// backend/src/services/soliscloud.js
import crypto from 'crypto'

/**
 * Build SolisCloud API auth headers using HMAC-SHA256.
 * Signs: "POST\n{md5}\napplication/json\n{date}\n{path}"
 */
export function buildAuthHeaders(apiId, apiSecret, path, body) {
  const contentMD5 = crypto
    .createHash('md5')
    .update(body)
    .digest('base64')

  const date = new Date().toUTCString()

  const stringToSign = `POST\n${contentMD5}\napplication/json\n${date}\n${path}`

  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(stringToSign)
    .digest('base64')

  return {
    'Content-Type': 'application/json',
    'Content-MD5': contentMD5,
    'Date': date,
    'Authorization': `API ${apiId}:${signature}`,
  }
}

/**
 * Make an authenticated POST to SolisCloud API.
 * @param {object} installer - { soliscloud_api_id, soliscloud_api_secret, soliscloud_api_url }
 * @param {string} endpoint - e.g. 'userStationList'
 * @param {object} body - request body
 */
export async function solisPost(installer, endpoint, body = {}) {
  const path = `/v1/api/${endpoint}`
  const bodyStr = JSON.stringify(body)
  const headers = buildAuthHeaders(
    installer.soliscloud_api_id,
    installer.soliscloud_api_secret,
    path,
    bodyStr
  )

  const url = `${installer.soliscloud_api_url}${path}`
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: bodyStr,
  })

  if (!response.ok) {
    throw new Error(`SolisCloud ${endpoint} error: ${response.status}`)
  }

  return response.json()
}

/** List all stations/plants for an installer account */
export async function getStationList(installer, pageNo = 1, pageSize = 100) {
  return solisPost(installer, 'userStationList', { pageNo, pageSize })
}

/** Get station detail (current power, status) */
export async function getStationDetail(installer, stationId) {
  return solisPost(installer, 'stationDetail', { id: stationId })
}

/** Get daily energy for a station on a specific date */
export async function getStationDailyEnergy(installer, stationId, date) {
  // date format: YYYYMMDD
  return solisPost(installer, 'stationDay', { id: stationId, time: date, timeZone: -3 })
}

/** Get monthly energy for a station */
export async function getStationMonthlyEnergy(installer, stationId, month) {
  // month format: YYYYMM
  return solisPost(installer, 'stationMonth', { id: stationId, time: month, timeZone: -3 })
}

/** Get yearly energy for a station */
export async function getStationYearlyEnergy(installer, stationId, year) {
  return solisPost(installer, 'stationYear', { id: stationId, time: String(year), timeZone: -3 })
}
