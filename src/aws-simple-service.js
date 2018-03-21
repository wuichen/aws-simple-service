import joi from 'joi'
import dynogels from './dynogels-bluebird-promise'
import { success, failure } from './response-lib'


// all simple utility / custom functions return promises
// if execute by route, instead of returning promises, calls callback function directly.
export default class simpleService {

	constructor(credentials, tableName, schema) {
		dynogels.AWS.config.update(credentials)
		Object.assign(this, dynogels.define(tableName, schema))
    this.hashKey = schema.hashKey
    this.rangeKey = schema.rangeKey
    this.isLambda = false
	}

  lambdaInit(event, context, callback) {
    this.ids = event.pathParameters
    this.data = JSON.parse(event.body)
    this.event = event
    this.context = context
    this.callback = callback
    this.isLambda = true
  }

  returnPromiseResult(result, isError) {

    return new Promise((resolve, reject) => {
      if (isError) {
        reject(result)
      } else {
        resolve(result)
      }
    })
  }

  // do we need a function to log all the roor messages to cloudwatch?
  logError() {
  }

  // currently lambda specific, calls callback directly.
  routes(routes) {
    if (!this.isLambda) {
      this.callback(null, failure({message: 'lambda not initialized'}))
    }
    const httpMethod = this.event.httpMethod.toUpperCase()
    let thisInstance = this
    let executing = false
    for (let i = 0; i < routes.length; i++) {
      if (this.event.resource === routes[i].path && httpMethod === routes[i].httpMethod) {
        executing = true
        let exec
        if (routes[i].params) {
          exec = routes[i].function.bind(this, routes[i].params)
        } else {
          exec = routes[i].function.bind(this)
        }
        exec().then((result) => {
          thisInstance.callback(null, success(result))
        }).catch((e) => {
          thisInstance.callback(null, failure(e))
        })
      } else if ((i === routes.length - 1) && !executing) {
        this.callback(null, failure({ statusCode: 404, error: 'API Route: ' + this.event.requestContext.resourcePath + ' not found!' }))
      }
    }
  }
	
  simpleGet (ids = this.ids) {
    return this.getAsync(ids)
  }

  simpleCreate (ids = this.ids, data = this.data) {
    // const modelData = JSON.parse(event.body)
    // todo: read only body data after api changes
    const modelData = Object.assign({}, (data && data), (ids && ids))
    return this.createAsync(modelData)
  }

  simpleUpdate (ids = this.ids, data = this.data) {
    const modelData = Object.assign({}, (data && data), (ids && ids))
    return this.updateAsync(modelData, {ReturnValues: 'ALL_NEW'})
  }

  simpleDelete (ids = this.ids) {
    return this.destroyAsync(ids )
  }

  simpleListByHashKey (ids = this.ids) {
    const hashKeyValue = !!ids ? ids[this.hashKey] : null
    if (hashKeyValue) {
      return this.query(hashKeyValue).loadAll().execAsync()
    } else {
      returnPromiseResult({message: 'no hash key in pathParameters'}, true)
    }
  }

  // simple add function to fields that are list type
  // ex: add new staffs to staff field in role object
  // const role = {
  //    staff: ['steven', 'eric']   
  // } 
  async simpleFieldListAdd (params, ids = this.ids, data = this.data) {
    if (data.items && data.items.length > 0) {
      let newItems = data.items
      try {
        const result = await this.getAsync(ids)
        let parentObject = result.get()

        if (parentObject) {
          
          // check if the list exists on the object. if not, create one
          if (!parentObject[params.field]) {
            parentObject[params.field] = []
          }
          let existingItems = parentObject[params.field]

          if (Array.isArray(existingItems)) {
            let newList = [...existingItems, ...newItems]
            const updateObject = {...ids}
            updateObject[params.field] = newList
            return this.updateAsync(updateObject, {ReturnValues: 'ALL_NEW'})
          } else {
            returnPromiseResult({message: 'field is not a list(array) type'}, true)
          }

        } else {
          returnPromiseResult({message: 'item was not found'}, true)
        }
      } catch (e) {
        // this catch is for the getAsync call
        returnPromiseResult(e, true)
      }
    } else {
      returnPromiseResult({message: '0 new items found in the request body'}, true)
    }
  }

  async simpleFieldListDelete(params, ids = this.ids, data = this.data) {
  	if (data.items && data.items.length > 0) {
      let toRemove = data.items
      try {
        const result = await this.getAsync(ids)
        let parentObject = result.get()
        if (parentObject) {
          // check if the list exists on the object. if not, exit
          if (!parentObject[params.field]) {
          	returnPromiseResult({message: 'list doesnt exist'}, true)
          } else if (parentObject[params.field].length < data.items.length) {
          	returnPromiseResult({message: 'more update items than existing items'}, true)
          } else {
          	let existingItems = parentObject[params.field]
	          if (Array.isArray(existingItems)) {

	          	let newList = existingItems.filter((item) => {
							  return toRemove.indexOf(item) < 0;
							});
	            const updateObject = {...ids}
	            updateObject[params.field] = newList
	            return this.updateAsync(updateObject, {ReturnValues: 'ALL_NEW'})
	          } else {
	            returnPromiseResult({message: 'field is not a list(array) type'}, true)
	          }
          }

        } else {
          returnPromiseResult({message: 'item was not found'}, true)
        }
      } catch (e) {
        // this catch is for the getAsync call
        returnPromiseResult(e, true)
      }
    } else {
      returnPromiseResult({message: '0 items found in the request body'}, true)
    }
  }

}
