const Constants = require(`${__dirname}/../../../../app/lib/constants`)
const globals = require(`${__dirname}/../../../../app/globals`) // Always required
const Session = require(`${__dirname}/../../../../app/lib/controllers/session`).Session
const httpMocks = require('node-mocks-http')
const DadiAPI = require('@dadi/api-wrapper')
const nock = require('nock')
const config = require(paths.config)

let session
let req
let res

const headers = {
  'content-type': 'application/json',
  'content-length': '100'
}

const next = jest.fn(() => {
  return true
})

const auth = config.get('auth')

beforeEach(() => {
  next.mockClear()
  config.set('auth.enabled', true)
  session = new Session()
  req = httpMocks.createRequest()
  res = httpMocks.createResponse({
    eventEmitter: require('events').EventEmitter
  })
  req.session = {
    passport: {
      user: {
        username: 'foo',
        email: 'foo@somedomain.com'
      }
    }
  }
  req.isAuthenticated = jest.fn(() => {
    return true
  })
  req.login = jest.fn()
})

describe('Session', () => {
  it('should export function', () => {
    expect(session).toBeInstanceOf(Object)
  })

  describe(`authorise()`, () => {
    it('should return 503 status code when auth is disabled', () => {
      config.set('auth.enabled', false)

      const returnAuthDisabledSpy = jest.spyOn(session, 'returnAuthDisabled')

      session.authorise('foo@somedomain.com', 'mockPassword', next)

      expect(returnAuthDisabledSpy)
        .toHaveBeenCalled()
    })

    it(`should call next with authUser when user is returned`, (done) => {

      DadiAPI.APIWrapper.prototype.find = jest.fn().mockImplementation(() => {
        return new Promise(resolve => {
          resolve(
            [{
              first_name: 'Foo',
              last_name: 'Foo',
              email: 'foo@somedomain.com',
              _id: 'mockId',
              handle: 'foo-bar'
            }]
          )
        })  
      })

      session.authorise('foo@somedomain.com', 'mockPassword', next)
        .then(resp => {
          expect(next).toBeCalledWith(null, expect.objectContaining({
            first_name: expect.any(String),
            last_name: expect.any(String),
            email: expect.any(String),
            _id: expect.any(String),
            handle: expect.any(String)
          }))
          done()
        })
    })

    it(`should return null when user is not found`, (done) => {

      DadiAPI.APIWrapper.prototype.find = jest.fn().mockImplementation(() => {
        return new Promise(resolve => {
          resolve([])
        })  
      })

      session.authorise('foo@somedomain.com', 'mockPassword', next)
        .then(resp => {
          expect(next).toBeCalledWith(null)
          done()
        })
    })

    it(`should return ${Constants.WRONG_CREDENTIALS} error when a reject error code matches`, (done) => {
      DadiAPI.APIWrapper.prototype.find = jest.fn().mockImplementation(() => {
        return new Promise((resolve, reject) => {
          reject({
            error: [{
              code: Constants.WRONG_CREDENTIALS
            }]
          })
        })  
      })

      session.authorise('foo@somedomain.com', 'mockPassword', next)
        .then(resp => {
          expect(next).toBeCalledWith(Constants.WRONG_CREDENTIALS)
          done()
        })
    })

    it(`should return ${Constants.AUTH_UNREACHABLE} error when a reject error code does not match`, (done) => {
      DadiAPI.APIWrapper.prototype.find = jest.fn().mockImplementation(() => {
        return new Promise((resolve, reject) => {
          reject()
        })  
      })

      session.authorise('foo@somedomain.com', 'mockPassword', next)
        .then(resp => {
          expect(next).toBeCalledWith(Constants.AUTH_UNREACHABLE)
          done()
        })
    })
  })

  describe(`delete()`, () => {
    it('should call logout method', () => {
      req.logout = jest.fn()

      session.delete(req, res, next)

      expect(req.logout)
        .toHaveBeenCalled()
    })

    it('should return false authenticated param', (done) => {
      req.logout = jest.fn()
      req.isAuthenticated = jest.fn(() => {
        return false
      })

      res.on('end', () => {
        expect(JSON.parse(res._getData())).toEqual(expect.objectContaining({
          authenticated: false
        }))
        done()
      })

      session.delete(req, res, next)
    })
  })

  describe(`get()`, () => {
    it('should return 503 status code when auth is disabled', (done) => {
      config.set('auth.enabled', false)
      res.on('end', () => {
        expect(res.statusCode).toBe(503)
        done()
      })
      session.get(req, res, next)
    })

    it(`should return ${Constants.AUTH_DISABLED} error`, (done) => {
      config.set('auth.enabled', false)
      res.on('end', () => {

        expect(JSON.parse(res._getData())).toEqual(expect.objectContaining({
          error: Constants.AUTH_DISABLED
        }))
        done()
      })
      session.get(req, res, next)
    })

    it('should return session data if user is authenticated', (done) => {
      res.on('end', () => {
        expect(JSON.parse(res._getData())).toEqual(expect.objectContaining({
          email: expect.any(String),
          username: expect.any(String)
        }))
        done()
      })
      session.get(req, res, next)
    })

    it('should return 401 when isAuthenticated returns false', (done) => {
      req.isAuthenticated = jest.fn(() => {
        return false
      })

      res.on('end', () => {
        expect(res.statusCode).toBe(401)
        done()
      })

      session.get(req, res, next)
    })
  })

  describe('put()', () => {
    it('should call login method', () => {
      req.login = jest.fn()

      session.put(req, res, next)

      expect(req.login)
        .toHaveBeenCalled()
    })

    it('should return 500 statusCode when login returns error', (done) => {
      req.login = jest.fn((body, data, callback) => {
        callback({err: 'errorMock'})
      })

      res.on('end', () => {
        expect(res.statusCode).toBe(500)
        done()
      })

      session.put(req, res, next)
    })

    it('should add an empty object to the response', (done) => {
      req.login = jest.fn((body, data, callback) => {
        callback()
      })

      res.on('end', () => {
        expect(res._getData()).toEqual('{}')
        done()
      })

      session.put(req, res, next)
    })

    it('should call next method', () => {
      session.put(req, res, next)

      expect(next)
        .toHaveBeenCalled()
    })
  })

  describe(`reset()`, () => {
    it('should return 503 status code when auth is disabled', (done) => {
      config.set('auth.enabled', false)
      res.on('end', () => {
        expect(res.statusCode).toBe(503)
        done()
      })
      session.reset(req, res, next)
    })

    it(`should return ${Constants.AUTH_DISABLED} error when auth is disabled`, (done) => {
      config.set('auth.enabled', false)
      res.on('end', () => {
        expect(JSON.parse(res._getData())).toEqual(expect.objectContaining({
          error: Constants.AUTH_DISABLED
        }))
        done()
      })
      session.reset(req, res, next)
    })

    it(`should return ${Constants.PASSWORD_RESET_INVALID} error if token and password are invalid`, (done) => {
      res.on('end', () => {
        expect(JSON.parse(res._getData())).toEqual(expect.objectContaining({
          error: Constants.PASSWORD_RESET_INVALID
        }))
        done()
      })
      session.reset(req, res, next)
    })

    it(`should return success if API returns results`, (done) => {
      req.body = {
        token: 'mockToken',
        password: 'mockPassword'
      }

      DadiAPI.APIWrapper.prototype.update = jest.fn().mockImplementation(() => {
        return new Promise(resolve => {
          resolve({
            results: [{}]
          })
        })  
      })

      res.on('end', () => {
        expect(JSON.parse(res._getData())).toEqual(expect.objectContaining({
          success: true
        }))
        done()
      })
      session.reset(req, res, next)
    })

    it(`should return error ${Constants.PASSWORD_RESET_FAILED} if API returns empty results`, (done) => {
      req.body = {
        token: 'mockToken',
        password: 'mockPassword'
      }

      DadiAPI.APIWrapper.prototype.update = jest.fn().mockImplementation(() => {
        return new Promise(resolve => {
          resolve({
            results: []
          })
        })  
      })

      res.on('end', () => {
        expect(JSON.parse(res._getData())).toEqual(expect.objectContaining({
          error: Constants.PASSWORD_RESET_FAILED
        }))
        done()
      })
      session.reset(req, res, next)
    })
  })

  describe('returnAuthDisabled()', () => {
    it('should call next with null if res is undefined', () => {
      session.returnAuthDisabled({next})

      expect(next).toBeCalledWith(null)
    })

    it('should set statusCode to 503', (done) => {

      res.on('end', () => {
        expect(res.statusCode).toBe(503)
        done()
      })
      session.returnAuthDisabled({res, next})
    })

    it(`should return ${Constants.AUTH_DISABLED} error`, (done) => {

      res.on('end', () => {
        expect(JSON.parse(res._getData())).toEqual(expect.objectContaining({
          error: Constants.AUTH_DISABLED
        }))
        done()
      })
      session.returnAuthDisabled({res, next})
    })

    it('should call next with no parameters when res is defined', () => {
      session.returnAuthDisabled({res, next})
      expect(next).toHaveBeenCalled()
    })
  })

  describe(`resetToken()`, () => {
    it('should return 503 status code when auth is disabled', (done) => {
      config.set('auth.enabled', false)
      res.on('end', () => {
        expect(res.statusCode).toBe(503)
        done()
      })
      session.resetToken(req, res, next)
    })

    it(`should return ${Constants.AUTH_DISABLED} error when auth is disabled`, (done) => {
      config.set('auth.enabled', false)
      res.on('end', () => {
        expect(JSON.parse(res._getData())).toEqual(expect.objectContaining({
          error: Constants.AUTH_DISABLED
        }))
        done()
      })
      session.resetToken(req, res, next)
    })

    it(`should return ${Constants.INVALID_EMAIL} error when address is missing from body`, (done) => {
      config.set('auth.enabled', true)

      res.on('end', () => {
        expect(JSON.parse(res._getData())).toEqual(expect.objectContaining({
          error: Constants.INVALID_EMAIL
        }))

        done()
      })
      session.resetToken(req, res, next)
    })

    it(`should return valid expiry object.`, (done) => {
      config.set('auth.enabled', true)
      req.body = {
        email: 'foo@somedomain.com'
      }
      
      res.on('end', () => {
        expect(JSON.parse(res._getData())).toEqual(expect.objectContaining({
          expiresAt: expect.any(Number)
        }))
        done()
      })
      session.resetToken(req, res, () => true)
    })
  })
})

/**
 * TO-DO
 * returnAuthDisabled √
 * authorise √
 * delete √
 * get √
 * post
 * put √
 * reset √
 * resetToken √
 */
