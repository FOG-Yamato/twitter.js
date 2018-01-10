const axios = require('axios')
const { createAPI } = require('./Util')

class Application {
  constructor(key, secret, token) {
    this.key = key
    this.secret = secret
    this.token = token
    this.api = token ? Application.createAPI(token) : null
  }

  get(url, opts) {
    return this.request(url, opts)
  }

  post(url, opts) {
    return this.request(url, { ...opts, method: 'POST' })
  }

  delete(url, opts) {
    return this.request(url, { ...opts, method: 'DELETE' })
  }

  //Internal request method
  async request(url, opts = {}) {
    if (!this.api) {
      try {
        await this.auth()
      } catch (err) {
        return Promise.reject(err)
      }
    }

    if (!url.endsWith('.json')) url += '.json'
    try {
      const { data } = await this.api.request({ ...opts, url })
      return data
    } catch (err) {
      return Promise.reject(err.response.data.errors[0].message)
    }
  }

  // OAuth 2.0 authentication method
  async auth() {
    const encoded = Buffer.from(`${this.key}:${this.secret}`).toString('base64')

    try {
      const { data: { access_token } } = await axios.request({
        method: 'POST',
        url: 'https://api.twitter.com/oauth2/token',
        data: 'grant_type=client_credentials',
        headers: {
          Authorization: `Basic ${encoded}`,
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8.'
        }
      })

      this.token = access_token
      this.api = Application.createAPI(access_token)
      return this
    } catch (err) {
      return Promise.reject(err.response.data.errors[0])
    }
  }

  static createAPI(token) {
    return createAPI('https://api.twitter.com/1.1/', { token })
  }
}

module.exports = Application
