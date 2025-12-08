import { Worker, isMainThread, parentPort, workerData } from 'worker_threads'
import { createReadStream, createWriteStream, promises as fs } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'
import { ZipFile } from 'yauzl'
import { WriteStream } from 'yazl'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { pipeline } from 'stream/promises'

// Export job interface
export interface ExportJob {
  id: string
  workspaceId: string
  userId: string
  projectId: string
  files: ExportFile[]
  config: ExportConfig
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  error?: string
  outputPath?: string
  downloadUrl?: string
  createdAt: Date
  updatedAt: Date
}

export interface ExportFile {
  path: string
  content: string
  type: 'html' | 'css' | 'js' | 'json' | 'md' | 'image' | 'font'
  size: number
}

export interface ExportConfig {
  format: 'zip' | 'tar' | 'folder'
  compression: 'none' | 'gzip' | 'brotli'
  minify: boolean
  includeSourceMaps: boolean
  optimizeImages: boolean
  storageProvider: 'local' | 's3' | 'r2' | 'backblaze'
  retention: number // days
}

// Storage provider configurations
export interface StorageConfig {
  s3?: {
    region: string
    bucket: string
    accessKeyId: string
    secretAccessKey: string
    endpoint?: string
  }
  r2?: {
    accountId: string
    bucket: string
    accessKeyId: string
    secretAccessKey: string
  }
  backblaze?: {
    bucket: string
    accessKeyId: string
    secretAccessKey: string
    endpoint: string
  }
  local?: {
    outputPath: string
    baseUrl: string
  }
}

// Background export worker
export class ExportWorker {
  private workers: Map<string, Worker> = new Map()
  private maxConcurrentJobs = 3
  private activeJobs = 0

  constructor() {
    // Clean up on process exit
    process.on('exit', () => this.cleanup())
    process.on('SIGINT', () => this.cleanup())
    process.on('SIGTERM', () => this.cleanup())
  }

  // Start export job in background
  async startExportJob(job: ExportJob, storageConfig: StorageConfig): Promise<void> {
    if (this.activeJobs >= this.maxConcurrentJobs) {
      throw new Error('Maximum concurrent export jobs reached')
    }

    const worker = new Worker(__filename, {
      workerData: {
        job,
        storageConfig,
        isWorker: true
      }
    })

    this.workers.set(job.id, worker)
    this.activeJobs++

    worker.on('message', (message) => {
      this.handleWorkerMessage(job.id, message)
    })

    worker.on('error', (error) => {
      console.error(`Export worker error for job ${job.id}:`, error)
      this.workers.delete(job.id)
      this.activeJobs--
    })

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Export worker exited with code ${code} for job ${job.id}`)
      }
      this.workers.delete(job.id)
      this.activeJobs--
    })
  }

  // Cancel export job
  async cancelExportJob(jobId: string): Promise<void> {
    const worker = this.workers.get(jobId)
    if (worker) {
      await worker.terminate()
      this.workers.delete(jobId)
      this.activeJobs--
    }
  }

  // Get job status
  getJobStatus(jobId: string): { active: boolean; progress?: number } {
    const worker = this.workers.get(jobId)
    return {
      active: !!worker,
      progress: worker ? 0 : undefined
    }
  }

  // Handle worker messages
  private handleWorkerMessage(jobId: string, message: any): void {
    switch (message.type) {
      case 'progress':
        // Update job progress in database
        this.updateJobProgress(jobId, message.progress)
        break
      case 'completed':
        // Handle job completion
        this.handleJobCompletion(jobId, message.result)
        break
      case 'error':
        // Handle job error
        this.handleJobError(jobId, message.error)
        break
    }
  }

  private async updateJobProgress(jobId: string, progress: number): Promise<void> {
    // Update database with progress
    // This would integrate with your database layer
    console.log(`Job ${jobId} progress: ${progress}%`)
  }

  private async handleJobCompletion(jobId: string, result: any): Promise<void> {
    // Update database with completion
    console.log(`Job ${jobId} completed:`, result)
  }

  private async handleJobError(jobId: string, error: string): Promise<void> {
    // Update database with error
    console.error(`Job ${jobId} failed:`, error)
  }

  private cleanup(): void {
    for (const [jobId, worker] of this.workers) {
      worker.terminate()
    }
    this.workers.clear()
  }
}

// Export processor (runs in worker thread)
export class ExportProcessor {
  private job: ExportJob
  private storageConfig: StorageConfig

  constructor(job: ExportJob, storageConfig: StorageConfig) {
    this.job = job
    this.storageConfig = storageConfig
  }

  // Process export job
  async process(): Promise<{ outputPath: string; downloadUrl: string; size: number }> {
    try {
      this.reportProgress(0)

      // Validate input
      this.validateInput()

      // Sanitize filenames
      this.reportProgress(5)
      const sanitizedFiles = this.sanitizeFilenames()

      // Apply optimizations
      this.reportProgress(10)
      const optimizedFiles = await this.optimizeFiles(sanitizedFiles)

      // Create export package
      this.reportProgress(30)
      const packagePath = await this.createPackage(optimizedFiles)

      // Upload to storage
      this.reportProgress(70)
      const { downloadUrl, size } = await this.uploadToStorage(packagePath)

      // Cleanup temporary files
      this.reportProgress(90)
      await this.cleanup(packagePath)

      this.reportProgress(100)

      return {
        outputPath: packagePath,
        downloadUrl,
        size
      }

    } catch (error) {
      throw new Error(`Export processing failed: ${error.message}`)
    }
  }

  // Validate input
  private validateInput(): void {
    if (!this.job.files || this.job.files.length === 0) {
      throw new Error('No files to export')
    }

    if (this.job.files.length > 1000) {
      throw new Error('Too many files (max 1000)')
    }

    const totalSize = this.job.files.reduce((sum, file) => sum + file.size, 0)
    if (totalSize > 100 * 1024 * 1024) { // 100MB limit
      throw new Error('Export too large (max 100MB)')
    }
  }

  // Sanitize filenames to prevent path traversal
  private sanitizeFilenames(): ExportFile[] {
    return this.job.files.map(file => ({
      ...file,
      path: this.sanitizePath(file.path)
    }))
  }

  private sanitizePath(path: string): string {
    // Remove directory traversal attempts
    const sanitized = path
      .replace(/\.\./g, '')
      .replace(/\\/g, '/')
      .replace(/\/+/g, '/')
      .replace(/^\//, '')

    // Ensure the path is within safe bounds
    if (sanitized.includes('..') || sanitized.startsWith('/') || sanitized.includes('~')) {
      throw new Error(`Invalid file path: ${path}`)
    }

    return sanitized
  }

  // Optimize files based on configuration
  private async optimizeFiles(files: ExportFile[]): Promise<ExportFile[]> {
    const optimized = []

    for (const file of files) {
      let optimizedContent = file.content
      let optimizedSize = file.size

      // Minify if requested
      if (this.job.config.minify) {
        optimizedContent = await this.minifyContent(file.content, file.type)
        optimizedSize = Buffer.byteLength(optimizedContent, 'utf8')
      }

      // Optimize images if requested
      if (this.job.config.optimizeImages && file.type === 'image') {
        optimizedContent = await this.optimizeImage(file.content)
        optimizedSize = Buffer.byteLength(optimizedContent, 'base64')
      }

      optimized.push({
        ...file,
        content: optimizedContent,
        size: optimizedSize
      })
    }

    return optimized
  }

  // Minify content based on type
  private async minifyContent(content: string, type: string): Promise<string> {
    switch (type) {
      case 'html':
        return this.minifyHTML(content)
      case 'css':
        return this.minifyCSS(content)
      case 'js':
        return this.minifyJS(content)
      default:
        return content
    }
  }

  private minifyHTML(html: string): string {
    return html
      .replace(/>\s+</g, '><')
      .replace(/\s+/g, ' ')
      .replace(/<!--[\s\S]*?-->/g, '')
      .trim()
  }

  private minifyCSS(css: string): string {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s+/g, ' ')
      .replace(/;\s*}/g, '}')
      .trim()
  }

  private minifyJS(js: string): string {
    return js
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  // Optimize image (placeholder - would use sharp in production)
  private async optimizeImage(imageData: string): Promise<string> {
    // This would use sharp or similar library to optimize images
    return imageData
  }

  // Create export package
  private async createPackage(files: ExportFile[]): Promise<string> {
    const timestamp = Date.now()
    const filename = `export-${this.job.id}-${timestamp}.zip`
    const outputPath = join('/tmp', filename)

    return new Promise((resolve, reject) => {
      const zipfile = new WriteStream()
      const output = createWriteStream(outputPath)

      output.on('close', () => resolve(outputPath))
      output.on('error', reject)
      zipfile.outputStream.pipe(output)

      // Add files to ZIP
      files.forEach(file => {
        zipfile.addBuffer(Buffer.from(file.content, 'utf8'), file.path)
      })

      zipfile.end()
    })
  }

  // Upload to storage provider
  private async uploadToStorage(packagePath: string): Promise<{ downloadUrl: string; size: number }> {
    const stats = await fs.stat(packagePath)
    const fileStream = createReadStream(packagePath)
    const filename = `exports/${this.job.workspaceId}/${this.job.projectId}/${Date.now()}.zip`

    switch (this.job.config.storageProvider) {
      case 's3':
        return this.uploadToS3(fileStream, filename, stats.size)
      case 'r2':
        return this.uploadToR2(fileStream, filename, stats.size)
      case 'backblaze':
        return this.uploadToBackblaze(fileStream, filename, stats.size)
      case 'local':
        return this.saveLocally(packagePath, filename, stats.size)
      default:
        throw new Error(`Unsupported storage provider: ${this.job.config.storageProvider}`)
    }
  }

  // Upload to S3
  private async uploadToS3(
    stream: NodeJS.ReadableStream,
    filename: string,
    size: number
  ): Promise<{ downloadUrl: string; size: number }> {
    const config = this.storageConfig.s3
    if (!config) throw new Error('S3 configuration not provided')

    const s3 = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    })

    const upload = new Upload({
      client: s3,
      params: {
        Bucket: config.bucket,
        Key: filename,
        Body: stream,
        ContentType: 'application/zip'
      }
    })

    await upload.done()

    const downloadUrl = `https://${config.bucket}.s3.${config.region}.amazonaws.com/${filename}`

    return { downloadUrl, size }
  }

  // Upload to Cloudflare R2
  private async uploadToR2(
    stream: NodeJS.ReadableStream,
    filename: string,
    size: number
  ): Promise<{ downloadUrl: string; size: number }> {
    const config = this.storageConfig.r2
    if (!config) throw new Error('R2 configuration not provided')

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    })

    const upload = new Upload({
      client: s3,
      params: {
        Bucket: config.bucket,
        Key: filename,
        Body: stream,
        ContentType: 'application/zip'
      }
    })

    await upload.done()

    const downloadUrl = `https://pub-${config.accountId}.r2.dev/${filename}`

    return { downloadUrl, size }
  }

  // Upload to Backblaze B2
  private async uploadToBackblaze(
    stream: NodeJS.ReadableStream,
    filename: string,
    size: number
  ): Promise<{ downloadUrl: string; size: number }> {
    // Backblaze B2 implementation would go here
    // For now, return a placeholder
    return {
      downloadUrl: `https://backblaze.example.com/${filename}`,
      size
    }
  }

  // Save locally
  private async saveLocally(
    packagePath: string,
    filename: string,
    size: number
  ): Promise<{ downloadUrl: string; size: number }> {
    const config = this.storageConfig.local
    if (!config) throw new Error('Local storage configuration not provided')

    const localPath = join(config.outputPath, filename)
    await fs.copyFile(packagePath, localPath)

    const downloadUrl = `${config.baseUrl}/${filename}`

    return { downloadUrl, size }
  }

  // Cleanup temporary files
  private async cleanup(packagePath: string): Promise<void> {
    try {
      await fs.unlink(packagePath)
    } catch (error) {
      console.error('Failed to cleanup temporary file:', error)
    }
  }

  // Report progress
  private reportProgress(progress: number): void {
    if (parentPort) {
      parentPort.postMessage({
        type: 'progress',
        progress
      })
    }
  }
}

// Worker thread execution
if (!isMainThread && workerData?.isWorker) {
  const { job, storageConfig } = workerData
  const processor = new ExportProcessor(job, storageConfig)

  processor.process()
    .then((result) => {
      if (parentPort) {
        parentPort.postMessage({
          type: 'completed',
          result
        })
      }
    })
    .catch((error) => {
      if (parentPort) {
        parentPort.postMessage({
          type: 'error',
          error: error.message
        })
      }
    })
}

// Export manager for coordinating exports
export class ExportManager {
  private worker = new ExportWorker()
  private jobs = new Map<string, ExportJob>()

  // Create new export job
  async createExportJob(
    workspaceId: string,
    userId: string,
    projectId: string,
    files: ExportFile[],
    config: ExportConfig,
    storageConfig: StorageConfig
  ): Promise<ExportJob> {
    const job: ExportJob = {
      id: this.generateJobId(),
      workspaceId,
      userId,
      projectId,
      files,
      config,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.jobs.set(job.id, job)

    // Start processing in background
    await this.worker.startExportJob(job, storageConfig)

    return job
  }

  // Get job status
  getJob(jobId: string): ExportJob | undefined {
    return this.jobs.get(jobId)
  }

  // Cancel job
  async cancelJob(jobId: string): Promise<void> {
    await this.worker.cancelExportJob(jobId)
    const job = this.jobs.get(jobId)
    if (job) {
      job.status = 'failed'
      job.error = 'Cancelled by user'
      job.updatedAt = new Date()
    }
  }

  // Clean up old jobs
  async cleanupOldJobs(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const now = Date.now()
    for (const [jobId, job] of this.jobs) {
      if (now - job.createdAt.getTime() > maxAge) {
        await this.worker.cancelExportJob(jobId)
        this.jobs.delete(jobId)
      }
    }
  }

  private generateJobId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Export utilities
export class ExportUtils {
  // Generate file hash for integrity checking
  static generateFileHash(content: string): string {
    return createHash('sha256').update(content).digest('hex')
  }

  // Validate export configuration
  static validateConfig(config: ExportConfig): string[] {
    const errors: string[] = []

    if (!['zip', 'tar', 'folder'].includes(config.format)) {
      errors.push('Invalid format')
    }

    if (!['none', 'gzip', 'brotli'].includes(config.compression)) {
      errors.push('Invalid compression')
    }

    if (config.retention < 1 || config.retention > 365) {
      errors.push('Invalid retention period (1-365 days)')
    }

    return errors
  }

  // Calculate estimated export size
  static estimateExportSize(files: ExportFile[], config: ExportConfig): number {
    let totalSize = files.reduce((sum, file) => sum + file.size, 0)

    // Apply compression estimates
    if (config.compression === 'gzip') {
      totalSize = Math.floor(totalSize * 0.7)
    } else if (config.compression === 'brotli') {
      totalSize = Math.floor(totalSize * 0.6)
    }

    // Apply minification estimates
    if (config.minify) {
      totalSize = Math.floor(totalSize * 0.8)
    }

    return totalSize
  }

  // Generate safe filename
  static generateSafeFilename(projectName: string, timestamp: Date): string {
    const safeName = projectName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    return `${safeName}-${timestamp.getTime()}.zip`
  }
}