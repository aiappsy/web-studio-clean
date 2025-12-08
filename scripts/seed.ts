import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Start seeding...')

  // Create sample users
  const user1 = await prisma.user.create({
    data: {
      email: 'john.doe@example.com',
      name: 'John Doe',
    },
  })

  const user2 = await prisma.user.create({
    data: {
      email: 'jane.smith@example.com',
      name: 'Jane Smith',
    },
  })

  const user3 = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Admin User',
    },
  })

  console.log('Created users:', { user1, user2, user3 })

  // Create sample posts
  const post1 = await prisma.post.create({
    data: {
      title: 'Getting Started with Next.js 15',
      content: 'Next.js 15 brings exciting new features including improved App Router, better performance, and enhanced developer experience. In this post, we\'ll explore the key features and how to get started with your first Next.js 15 application.',
      published: true,
      authorId: user1.id,
    },
  })

  const post2 = await prisma.post.create({
    data: {
      title: 'TypeScript Best Practices in 2024',
      content: 'TypeScript continues to evolve with new features and improvements. This post covers the latest best practices for writing type-safe code, using advanced TypeScript features, and maintaining large-scale TypeScript applications.',
      published: true,
      authorId: user2.id,
    },
  })

  const post3 = await prisma.post.create({
    data: {
      title: 'Building Modern UI with Tailwind CSS 4',
      content: 'Tailwind CSS 4 introduces significant improvements in performance, developer experience, and customization. Learn how to leverage the latest features to build beautiful, responsive interfaces with less code.',
      published: false,
      authorId: user1.id,
    },
  })

  const post4 = await prisma.post.create({
    data: {
      title: 'State Management with Zustand',
      content: 'Zustand provides a simple yet powerful solution for state management in React applications. This guide covers everything from basic usage to advanced patterns for complex applications.',
      published: true,
      authorId: user3.id,
    },
  })

  console.log('Created posts:', { post1, post2, post3, post4 })

  console.log('Seeding finished.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })