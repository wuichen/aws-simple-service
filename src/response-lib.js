export function success (body) {
  return buildResponse(200, body)
}

export function failure (body) {
  return buildResponse(body.statusCode, body)
}

function buildResponse (statusCode = 500, body) {
  return {
    statusCode: statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify(body)
  }
}
