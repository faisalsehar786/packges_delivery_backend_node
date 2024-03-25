const axios = require('axios')

async function getCompanyInfo(org_number) {
  const config = {
    method: 'get',
    url: `https://data.brreg.no/enhetsregisteret/api/enheter/${org_number}`,
    headers: {
      'Content-Type': 'application/json',
    },
  }
  const compInfoPayload = await axios(config)
  return compInfoPayload?.data
}

module.exports = {
  getCompanyInfo,
}
