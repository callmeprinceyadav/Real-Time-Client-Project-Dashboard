import { PrismaClient, Role, TaskStatus, TaskPriority, ProjectStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 12);

  // Create Users
  const admin = await prisma.user.create({
    data: { email: 'admin@velozity.com', password: hashedPassword, name: 'Prince Yadav', role: Role.ADMIN },
  });

  const pm1 = await prisma.user.create({
    data: { email: 'prince@velozity.com', password: hashedPassword, name: 'Prince Yadav', role: Role.PM },
  });

  const pm2 = await prisma.user.create({
    data: { email: 'priya@velozity.com', password: hashedPassword, name: 'Priya', role: Role.PM },
  });

  const dev1 = await prisma.user.create({
    data: { email: 'Deepak@velozity.com', password: hashedPassword, name: 'Deepak Yadav', role: Role.DEVELOPER },
  });

  const dev2 = await prisma.user.create({
    data: { email: 'sneha@velozity.com', password: hashedPassword, name: 'Sneha Reddy', role: Role.DEVELOPER },
  });

  const dev3 = await prisma.user.create({
    data: { email: 'kunal@velozity.com', password: hashedPassword, name: 'Kunal Verma', role: Role.DEVELOPER },
  });

  const dev4 = await prisma.user.create({
    data: { email: 'neha@velozity.com', password: hashedPassword, name: 'Neha Gupta', role: Role.DEVELOPER },
  });

  console.log('✅ Users created');

  // Create Clients
  const client1 = await prisma.client.create({
    data: { name: 'FloNeo Technologies', email: 'contact@floneo.com', company: 'FloNeo Technologies', phone: '+91-9876543210' },
  });

  const client2 = await prisma.client.create({
    data: { name: 'GreenLeaf Organics', email: 'hello@greenleaf.in', company: 'GreenLeaf Organics Ltd', phone: '+91-8765432109' },
  });

  const client3 = await prisma.client.create({
    data: { name: 'Masai School', email: 'info@masaischool.com', company: 'Masai School', phone: '+91-7654321098' },
  });

  console.log('✅ Clients created');

  // Create Projects
  const project1 = await prisma.project.create({
    data: {
      name: 'FloNeo Platform',
      description: 'Full-stack e-commerce platform with payment integration, inventory management, and analytics dashboard.',
      status: ProjectStatus.ACTIVE,
      clientId: client1.id,
      createdById: pm1.id,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'GreenLeaf Mobile App',
      description: 'Cross-platform mobile application for organic produce ordering with real-time delivery tracking.',
      status: ProjectStatus.ACTIVE,
      clientId: client2.id,
      createdById: pm1.id,
    },
  });

  const project3 = await prisma.project.create({
    data: {
      name: 'UrbanPulse CMS Redesign',
      description: 'Complete redesign and migration of the content management system with a modern headless architecture.',
      status: ProjectStatus.ACTIVE,
      clientId: client3.id,
      createdById: pm2.id,
    },
  });

  console.log('✅ Projects created');

  // Create Tasks for Project 1 (TechNova E-Commerce)
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const task1_1 = await prisma.task.create({
    data: {
      title: 'Setup payment gateway integration',
      description: 'Integrate Razorpay payment gateway with order checkout flow, handle webhooks for payment confirmation.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.CRITICAL,
      dueDate: threeDaysFromNow,
      projectId: project1.id,
      assignedToId: dev1.id,
    },
  });

  const task1_2 = await prisma.task.create({
    data: {
      title: 'Build product catalog API',
      description: 'RESTful API for product CRUD with pagination, filtering, search, and image upload support.',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      dueDate: twoDaysAgo,
      projectId: project1.id,
      assignedToId: dev1.id,
    },
  });

  const task1_3 = await prisma.task.create({
    data: {
      title: 'Design shopping cart UI',
      description: 'Responsive shopping cart with quantity adjustment, coupon application, and price summary.',
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.HIGH,
      dueDate: fiveDaysFromNow,
      projectId: project1.id,
      assignedToId: dev2.id,
    },
  });

  const task1_4 = await prisma.task.create({
    data: {
      title: 'Implement user authentication',
      description: 'OAuth2 social login + email/password auth with JWT tokens and session management.',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: oneWeekFromNow,
      projectId: project1.id,
      assignedToId: dev2.id,
    },
  });

  // OVERDUE task
  const task1_5 = await prisma.task.create({
    data: {
      title: 'Setup CI/CD pipeline',
      description: 'Configure GitHub Actions for automated testing, lint checks, and deployment to staging.',
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      dueDate: threeDaysAgo,
      isOverdue: true,
      projectId: project1.id,
      assignedToId: dev1.id,
    },
  });

  const task1_6 = await prisma.task.create({
    data: {
      title: 'Inventory management module',
      description: 'Admin panel for stock tracking, low-stock alerts, and supplier integration.',
      status: TaskStatus.TODO,
      priority: TaskPriority.LOW,
      dueDate: oneWeekFromNow,
      projectId: project1.id,
      assignedToId: dev3.id,
    },
  });

  // Create Tasks for Project 2 (GreenLeaf Mobile App)
  const task2_1 = await prisma.task.create({
    data: {
      title: 'Design delivery tracking screen',
      description: 'Real-time map view showing delivery partner location, ETA, and order status updates.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      dueDate: fiveDaysFromNow,
      projectId: project2.id,
      assignedToId: dev3.id,
    },
  });

  const task2_2 = await prisma.task.create({
    data: {
      title: 'Build push notification service',
      description: 'FCM-based push notifications for order updates, promotions, and delivery alerts.',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: oneWeekFromNow,
      projectId: project2.id,
      assignedToId: dev4.id,
    },
  });

  const task2_3 = await prisma.task.create({
    data: {
      title: 'Create product listing API',
      description: 'API endpoints for browsing organic products by category with filter and sort options.',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      dueDate: twoDaysAgo,
      projectId: project2.id,
      assignedToId: dev3.id,
    },
  });

  const task2_4 = await prisma.task.create({
    data: {
      title: 'Setup order management system',
      description: 'Order creation, status tracking, cancellation, and refund processing workflow.',
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.CRITICAL,
      dueDate: threeDaysFromNow,
      projectId: project2.id,
      assignedToId: dev4.id,
    },
  });

  // OVERDUE task
  const task2_5 = await prisma.task.create({
    data: {
      title: 'Implement user onboarding flow',
      description: 'Welcome screens, address setup, preference selection, and first-order discount flow.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      dueDate: threeDaysAgo,
      isOverdue: true,
      projectId: project2.id,
      assignedToId: dev4.id,
    },
  });

  // Create Tasks for Project 3 (UrbanPulse CMS Redesign)
  const task3_1 = await prisma.task.create({
    data: {
      title: 'Architect headless CMS schema',
      description: 'Design content models, relationships, and migration strategy from legacy system.',
      status: TaskStatus.DONE,
      priority: TaskPriority.CRITICAL,
      dueDate: threeDaysAgo,
      projectId: project3.id,
      assignedToId: dev2.id,
    },
  });

  const task3_2 = await prisma.task.create({
    data: {
      title: 'Build content editor UI',
      description: 'Rich text editor with drag-and-drop blocks, media embedding, and preview mode.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      dueDate: fiveDaysFromNow,
      projectId: project3.id,
      assignedToId: dev2.id,
    },
  });

  const task3_3 = await prisma.task.create({
    data: {
      title: 'API Gateway & Authentication',
      description: 'Setup API gateway with rate limiting, API key management, and role-based access.',
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      dueDate: oneWeekFromNow,
      projectId: project3.id,
      assignedToId: dev4.id,
    },
  });

  const task3_4 = await prisma.task.create({
    data: {
      title: 'Media asset management',
      description: 'CDN integration, image optimization pipeline, and asset library with tagging.',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: oneWeekFromNow,
      projectId: project3.id,
      assignedToId: dev1.id,
    },
  });

  const task3_5 = await prisma.task.create({
    data: {
      title: 'SEO metadata management',
      description: 'Per-page SEO settings, Open Graph tags, sitemap generation, and structured data.',
      status: TaskStatus.TODO,
      priority: TaskPriority.LOW,
      dueDate: oneWeekFromNow,
      projectId: project3.id,
      assignedToId: dev3.id,
    },
  });

  console.log('✅ Tasks created');

  // Create Activity Logs
  const activityData = [
    {
      action: 'PROJECT_CREATED',
      details: `Ravi Sharma created project "TechNova E-Commerce Platform"`,
      projectId: project1.id,
      userId: pm1.id,
      createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    },
    {
      action: 'TASK_CREATED',
      details: `Ravi Sharma created task "Build product catalog API"`,
      taskId: task1_2.id,
      projectId: project1.id,
      userId: pm1.id,
      createdAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
    },
    {
      action: 'TASK_STATUS_CHANGED',
      details: `Amit Patel moved "Build product catalog API" from To Do → In Progress`,
      taskId: task1_2.id,
      projectId: project1.id,
      userId: dev1.id,
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      action: 'TASK_STATUS_CHANGED',
      details: `Amit Patel moved "Build product catalog API" from In Progress → In Review`,
      taskId: task1_2.id,
      projectId: project1.id,
      userId: dev1.id,
      createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    },
    {
      action: 'TASK_STATUS_CHANGED',
      details: `Ravi Sharma moved "Build product catalog API" from In Review → Done`,
      taskId: task1_2.id,
      projectId: project1.id,
      userId: pm1.id,
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      action: 'TASK_CREATED',
      details: `Ravi Sharma created task "Setup payment gateway integration"`,
      taskId: task1_1.id,
      projectId: project1.id,
      userId: pm1.id,
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      action: 'TASK_STATUS_CHANGED',
      details: `Amit Patel moved "Setup payment gateway integration" from To Do → In Progress`,
      taskId: task1_1.id,
      projectId: project1.id,
      userId: dev1.id,
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      action: 'TASK_STATUS_CHANGED',
      details: `Sneha Reddy moved "Design shopping cart UI" from To Do → In Progress`,
      taskId: task1_3.id,
      projectId: project1.id,
      userId: dev2.id,
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      action: 'TASK_STATUS_CHANGED',
      details: `Sneha Reddy moved "Design shopping cart UI" from In Progress → In Review`,
      taskId: task1_3.id,
      projectId: project1.id,
      userId: dev2.id,
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      action: 'TASK_OVERDUE',
      details: `Task "Setup CI/CD pipeline" is now overdue`,
      taskId: task1_5.id,
      projectId: project1.id,
      userId: dev1.id,
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      action: 'PROJECT_CREATED',
      details: `Ravi Sharma created project "GreenLeaf Mobile App"`,
      projectId: project2.id,
      userId: pm1.id,
      createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
    },
    {
      action: 'TASK_STATUS_CHANGED',
      details: `Kunal Verma moved "Create product listing API" from In Progress → Done`,
      taskId: task2_3.id,
      projectId: project2.id,
      userId: dev3.id,
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      action: 'TASK_STATUS_CHANGED',
      details: `Neha Gupta moved "Setup order management system" from In Progress → In Review`,
      taskId: task2_4.id,
      projectId: project2.id,
      userId: dev4.id,
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      action: 'TASK_OVERDUE',
      details: `Task "Implement user onboarding flow" is now overdue`,
      taskId: task2_5.id,
      projectId: project2.id,
      userId: dev4.id,
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      action: 'PROJECT_CREATED',
      details: `Priya Kapoor created project "UrbanPulse CMS Redesign"`,
      projectId: project3.id,
      userId: pm2.id,
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      action: 'TASK_STATUS_CHANGED',
      details: `Sneha Reddy moved "Architect headless CMS schema" from In Review → Done`,
      taskId: task3_1.id,
      projectId: project3.id,
      userId: dev2.id,
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      action: 'TASK_STATUS_CHANGED',
      details: `Sneha Reddy moved "Build content editor UI" from To Do → In Progress`,
      taskId: task3_2.id,
      projectId: project3.id,
      userId: dev2.id,
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      action: 'TASK_ASSIGNED',
      details: `Priya Kapoor assigned "API Gateway & Authentication" to Neha Gupta`,
      taskId: task3_3.id,
      projectId: project3.id,
      userId: pm2.id,
      createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const activity of activityData) {
    await prisma.activityLog.create({ data: activity });
  }

  console.log('✅ Activity logs created');

  // Create Notifications
  const notificationData = [
    {
      type: 'TASK_ASSIGNED',
      message: 'Ravi Sharma assigned you to task "Setup payment gateway integration"',
      userId: dev1.id,
      relatedTaskId: task1_1.id,
      isRead: true,
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'TASK_ASSIGNED',
      message: 'Ravi Sharma assigned you to task "Design shopping cart UI"',
      userId: dev2.id,
      relatedTaskId: task1_3.id,
      isRead: true,
      createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'TASK_IN_REVIEW',
      message: 'Sneha Reddy moved "Design shopping cart UI" to In Review',
      userId: pm1.id,
      relatedTaskId: task1_3.id,
      isRead: false,
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'TASK_OVERDUE',
      message: 'Your task "Setup CI/CD pipeline" is now overdue',
      userId: dev1.id,
      relatedTaskId: task1_5.id,
      isRead: false,
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'TASK_IN_REVIEW',
      message: 'Neha Gupta moved "Setup order management system" to In Review',
      userId: pm1.id,
      relatedTaskId: task2_4.id,
      isRead: false,
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'TASK_ASSIGNED',
      message: 'Priya Kapoor assigned you to task "API Gateway & Authentication"',
      userId: dev4.id,
      relatedTaskId: task3_3.id,
      isRead: false,
      createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'TASK_OVERDUE',
      message: 'Your task "Implement user onboarding flow" is now overdue',
      userId: dev4.id,
      relatedTaskId: task2_5.id,
      isRead: false,
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const notification of notificationData) {
    await prisma.notification.create({ data: notification });
  }

  console.log('✅ Notifications created');
  console.log('');
  console.log('🎉 Seed complete! Login credentials:');
  console.log('   Admin:     admin@velozity.com / password123');
  console.log('   PM 1:      ravi@velozity.com / password123');
  console.log('   PM 2:      priya@velozity.com / password123');
  console.log('   Dev 1:     amit@velozity.com / password123');
  console.log('   Dev 2:     sneha@velozity.com / password123');
  console.log('   Dev 3:     kunal@velozity.com / password123');
  console.log('   Dev 4:     neha@velozity.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
