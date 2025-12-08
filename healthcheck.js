const http = require('http')

// Health check configuration
const options = {
  host: 'localhost',
  port: process.env.PORT || 3000,
  path: '/api/health',
  timeout: 5000,
  method: 'GET',
  headers: {
    'User-Agent': 'HealthCheck/1.0'
  }
}

const startTime = Date.now()

const request = http.request(options, (res) => {
  let data = ''
  
  res.on('data', (chunk) => {
    data += chunk
  })
  
  res.on('end', () => {
    const responseTime = Date.now() - startTime
    
    try {
      const healthData = JSON.parse(data)
      
      // Check if health check passed
      if (res.statusCode === 200 && healthData.status === 'healthy') {
        console.log(`Health check passed: ${res.statusCode} (${responseTime}ms)`)
        console.log(`Database: ${healthData.database?.status || 'unknown'}`)
        console.log(`Memory: ${healthData.memory?.used || 'unknown'}MB`)
        process.exit(0)
      } else {
        console.error(`Health check failed: ${res.statusCode}`)
        console.error(`Response: ${data}`)
        process.exit(1)
      }
    } catch (parseError) {
      console.error(`Health check failed: Invalid response format`)
      console.error(`Response: ${data}`)
      process.exit(1)
    }
  })
})

request.on('error', (err) => {
  const responseTime = Date.now() - startTime
  console.error(`Health check failed: ${err.message} (${responseTime}ms)`)
  process.exit(1)
})

request.on('timeout', () => {
  const responseTime = Date.now() - startTime
  console.error(`Health check timed out (${responseTime}ms)`)
  request.destroy()
  process.exit(1)
})

request.setTimeout(options.timeout)
request.end()